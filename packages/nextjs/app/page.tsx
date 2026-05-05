"use client";

import { useEffect, useMemo, useState } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useTargetNetwork,
} from "~~/hooks/scaffold-eth";
import { getParsedError } from "~~/utils/scaffold-eth";

type Submission = {
  id: string;
  hackerName: string;
  payoutWallet: string;
  projectUrl: string;
  notes: string;
};

type BountyView = {
  sponsor: string;
  judge: string;
  token: string;
  amount: bigint;
  deadline: bigint;
  winner: string;
  status: number;
  metadataURI: string;
};

type TxNotice = {
  title: string;
  hash?: string;
};

const STATUS_LABELS = ["Created", "Funded", "Awarded", "Refunded"];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const TOKEN_DECIMALS = 18;
const LOCAL_SUBMISSIONS_KEY = "prizelock-demo-submissions";

const defaultDeadline = () => {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  oneHourFromNow.setSeconds(0, 0);

  // datetime-local expects local time, not UTC.
  const timezoneOffset = oneHourFromNow.getTimezoneOffset() * 60 * 1000;
  return new Date(oneHourFromNow.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const formatTokenAmount = (value?: bigint) => {
  if (value === undefined) return "0";
  return formatUnits(value, TOKEN_DECIMALS);
};

const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

const Home: NextPage = () => {
  const { address: connectedAddress, chain } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { data: mockToken } = useDeployedContractInfo({ contractName: "MockERC20" });
  const { data: escrow } = useDeployedContractInfo({ contractName: "PrizeLockEscrow" });

  const { writeContractAsync: writeMockToken, isMining: isTokenTxMining } = useScaffoldWriteContract({
    contractName: "MockERC20",
  });
  const { writeContractAsync: writeEscrow, isMining: isEscrowTxMining } = useScaffoldWriteContract({
    contractName: "PrizeLockEscrow",
  });

  const [judgeAddress, setJudgeAddress] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [prizeAmount, setPrizeAmount] = useState("1000");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [metadataURI, setMetadataURI] = useState("PrizeLock demo bounty");
  const [activeBountyId, setActiveBountyId] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [submissionForm, setSubmissionForm] = useState({
    hackerName: "",
    payoutWallet: "",
    projectUrl: "",
    notes: "",
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});
  const [lastError, setLastError] = useState("");
  const [lastSuccess, setLastSuccess] = useState<TxNotice | undefined>();

  useEffect(() => {
    if (mockToken?.address && !tokenAddress) {
      setTokenAddress(mockToken.address);
    }
  }, [mockToken?.address, tokenAddress]);

  useEffect(() => {
    const storedSubmissions = window.localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    if (storedSubmissions) {
      setSubmissions(JSON.parse(storedSubmissions));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(submissions));
  }, [submissions]);

  const parsedPrizeAmount = useMemo(() => {
    try {
      return prizeAmount ? parseUnits(prizeAmount, TOKEN_DECIMALS) : 0n;
    } catch {
      return 0n;
    }
  }, [prizeAmount]);

  const bountyId = activeBountyId ? BigInt(activeBountyId) : undefined;
  const isLocalNetwork = chain?.id === targetNetwork.id;

  const { data: nextBountyId } = useScaffoldReadContract({
    contractName: "PrizeLockEscrow",
    functionName: "nextBountyId",
  });

  const { data: tokenBalance, refetch: refetchBalance } = useScaffoldReadContract({
    contractName: "MockERC20",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  const { data: allowance, refetch: refetchAllowance } = useScaffoldReadContract({
    contractName: "MockERC20",
    functionName: "allowance",
    args: [connectedAddress, escrow?.address],
  });

  const { data: bountyData, refetch: refetchBounty } = useScaffoldReadContract({
    contractName: "PrizeLockEscrow",
    functionName: "getBounty",
    args: [bountyId],
  });

  const bounty = bountyData as BountyView | undefined;
  const selectedSubmission = submissions.find(submission => submission.id === selectedSubmissionId);
  const selectedPayoutWallet = selectedSubmission?.payoutWallet ?? "";
  const statusLabel = bounty
    ? (STATUS_LABELS[Number(bounty.status)] ?? `Unknown (${bounty.status})`)
    : "No bounty loaded";
  const hasEnoughAllowance = (allowance ?? 0n) >= parsedPrizeAmount && parsedPrizeAmount > 0n;
  const isCreated = Boolean(bounty);
  const isFunded = bounty?.status === 1;
  const isAwarded = bounty?.status === 2;
  const isRefunded = bounty?.status === 3;
  const hasSubmission = submissions.length > 0;
  const isSponsor = Boolean(connectedAddress && bounty?.sponsor?.toLowerCase() === connectedAddress.toLowerCase());
  const isJudge = Boolean(connectedAddress && bounty?.judge?.toLowerCase() === connectedAddress.toLowerCase());
  const deadlineDate = bounty?.deadline ? new Date(Number(bounty.deadline) * 1000) : undefined;
  const deadlinePassed = bounty?.deadline ? BigInt(Math.floor(Date.now() / 1000)) > bounty.deadline : false;
  const isTxMining = isTokenTxMining || isEscrowTxMining;

  const progressSteps = [
    { label: "Created", done: isCreated },
    { label: "Funded", done: isFunded || isAwarded || isRefunded },
    { label: "Submitted", done: hasSubmission },
    { label: "Winner selected", done: Boolean(selectedSubmission) || isAwarded },
    { label: "Paid", done: isAwarded },
  ];

  const runTx = async (key: string, successTitle: string, action: () => Promise<string | undefined>) => {
    setLastError("");
    setLastSuccess(undefined);

    try {
      const hash = await action();
      if (hash) {
        setTxHashes(previous => ({ ...previous, [key]: hash }));
        setLastSuccess({ title: successTitle, hash });
      }
      await Promise.all([refetchBalance(), refetchAllowance(), refetchBounty()]);
      return hash;
    } catch (error) {
      setLastError(getParsedError(error));
    }
  };

  const handleMint = async () => {
    if (!connectedAddress) return setLastError("Connect a wallet before minting fake demo money.");

    await runTx("mint", "Fake demo tokens minted.", () =>
      writeMockToken({
        functionName: "mint",
        args: [connectedAddress, parseUnits("10000", TOKEN_DECIMALS)],
      }),
    );
  };

  const handleCreateBounty = async () => {
    if (!isAddress(judgeAddress)) return setLastError("Enter a valid judge wallet address.");
    if (!isAddress(tokenAddress)) return setLastError("Enter a valid token address.");
    if (parsedPrizeAmount <= 0n) return setLastError("Prize amount must be greater than zero.");

    const deadlineMs = new Date(deadline).getTime();
    if (Number.isNaN(deadlineMs)) return setLastError("Choose a valid deadline.");

    const deadlineSeconds = BigInt(Math.floor(deadlineMs / 1000));
    const nextId = nextBountyId ?? 1n;

    const hash = await runTx("create", "Bounty created.", () =>
      writeEscrow({
        functionName: "createBounty",
        args: [judgeAddress, tokenAddress, parsedPrizeAmount, deadlineSeconds, metadataURI],
      }),
    );

    if (hash) setActiveBountyId(nextId.toString());
  };

  const handleApprove = async () => {
    if (!escrow?.address) return setLastError("Prize escrow is not deployed on the local chain.");
    if (parsedPrizeAmount <= 0n) return setLastError("Prize amount must be greater than zero.");

    await runTx("approve", "Prize escrow approval confirmed.", () =>
      writeMockToken({
        functionName: "approve",
        args: [escrow.address, parsedPrizeAmount],
      }),
    );
  };

  const handleFund = async () => {
    if (!bountyId) return setLastError("Create or load a bounty before funding.");
    if (!hasEnoughAllowance)
      return setLastError("Approve prize escrow spend and wait for confirmation before funding.");

    await runTx("fund", "Prize escrow funded.", () =>
      writeEscrow({
        functionName: "fundBounty",
        args: [bountyId],
      }),
    );
  };

  const handleAddSubmission = () => {
    if (!submissionForm.hackerName.trim()) return setLastError("Add a hacker name.");
    if (!isAddress(submissionForm.payoutWallet)) return setLastError("Enter a valid payout wallet address.");

    const submission = {
      id: crypto.randomUUID(),
      ...submissionForm,
    };

    setSubmissions(previous => [submission, ...previous]);
    setSelectedSubmissionId(submission.id);
    setSubmissionForm({ hackerName: "", payoutWallet: "", projectUrl: "", notes: "" });
    setLastError("");
    setLastSuccess({ title: "Project submission saved locally." });
  };

  const handleAward = async () => {
    if (!bountyId) return setLastError("Create or load a bounty before releasing the prize.");
    if (!selectedSubmission) return setLastError("Choose a project submission before releasing the prize.");
    if (!isAddress(selectedPayoutWallet)) return setLastError("The selected submission needs a valid payout wallet.");

    await runTx("award", "Prize released to the selected payout wallet.", () =>
      writeEscrow({
        functionName: "awardWinner",
        args: [bountyId, selectedPayoutWallet],
      }),
    );
  };

  const handleRefund = async () => {
    if (!bountyId) return setLastError("Create or load a bounty before refunding.");

    await runTx("refund", "Prize refunded to the sponsor.", () =>
      writeEscrow({
        functionName: "refundSponsor",
        args: [bountyId],
      }),
    );
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8">
        <section className="rounded-lg bg-base-100 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">PrizeLock</p>
              <h1 className="text-3xl font-bold">Hackathon bounty payout demo</h1>
              <p className="mt-2 max-w-3xl text-sm text-base-content/70">
                Create a bounty, lock fake local prize money, collect project submissions in this browser, then let the
                judge release the prize to one payout wallet.
              </p>
            </div>
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="font-semibold">Local demo money only</p>
              <p className="mt-1 text-base-content/70">
                PRIZE tokens are fake MockERC20 tokens on your local Hardhat chain. They are not real money.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-base-100 p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Demo progress</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {progressSteps.map((step, index) => (
              <div
                key={step.label}
                className={`rounded-lg border p-3 text-sm ${
                  step.done ? "border-success bg-success/10" : "border-base-300 bg-base-200"
                }`}
              >
                <p className="text-xs text-base-content/60">Step {index + 1}</p>
                <p className="font-semibold">{step.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg bg-base-100 p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Wallet</h2>
            <p className="mt-1 text-sm text-base-content/70">
              You can add project submissions without a wallet. Connect a wallet for sponsor and judge transactions.
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <Address address={connectedAddress} chain={targetNetwork} />
              <p>
                Network: <span className="font-medium">{chain?.name ?? "Not connected"}</span>
              </p>
              {connectedAddress && (
                <div className="rounded-lg border border-info/40 bg-info/10 p-3 text-xs">
                  First-time local wallet? Use the floating <span className="font-semibold">Faucet</span> button at the
                  bottom-left to send this wallet a little local ETH for gas before minting PRIZE.
                </div>
              )}
              {!isLocalNetwork && (
                <div className="alert alert-warning text-sm">
                  Switch to the local Hardhat chain before creating, funding, or releasing a prize.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-base-100 p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Transaction messages</h2>
            {lastSuccess ? (
              <div className="alert alert-success mt-3 text-sm">
                <div>
                  <p className="font-semibold">{lastSuccess.title}</p>
                  {lastSuccess.hash && <p className="break-all font-mono text-xs">{lastSuccess.hash}</p>}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-base-content/70">Successful transactions and local saves appear here.</p>
            )}
            {lastError && <div className="alert alert-error mt-3 whitespace-pre-wrap text-sm">{lastError}</div>}
          </div>
        </section>

        <section className="rounded-lg bg-base-100 p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Sponsor</h2>
              <p className="text-sm text-base-content/70">
                Set the bounty details, mint fake demo money, approve the escrow, then fund the prize.
              </p>
            </div>
            <div className="text-sm">
              <p>
                Wallet PRIZE balance: <span className="font-mono">{formatTokenAmount(tokenBalance)}</span>
              </p>
              <p>
                Escrow allowance: <span className="font-mono">{formatTokenAmount(allowance)}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="form-control">
              <span className="label-text">Judge wallet address</span>
              <div className="join">
                <input
                  className="input input-bordered join-item w-full"
                  value={judgeAddress}
                  onChange={event => setJudgeAddress(event.target.value)}
                />
                <button
                  className="btn join-item"
                  disabled={!connectedAddress}
                  type="button"
                  onClick={() => connectedAddress && setJudgeAddress(connectedAddress)}
                >
                  Mine
                </button>
              </div>
            </label>
            <label className="form-control">
              <span className="label-text">Prize token</span>
              <div className="join">
                <input
                  className="input input-bordered join-item w-full"
                  value={tokenAddress}
                  onChange={event => setTokenAddress(event.target.value)}
                />
                <button
                  className="btn join-item"
                  disabled={!mockToken?.address}
                  type="button"
                  onClick={() => mockToken?.address && setTokenAddress(mockToken.address)}
                >
                  Demo token
                </button>
              </div>
            </label>
            <label className="form-control">
              <span className="label-text">Prize amount</span>
              <input
                className="input input-bordered"
                value={prizeAmount}
                onChange={event => setPrizeAmount(event.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text">Submission deadline</span>
              <input
                className="input input-bordered"
                type="datetime-local"
                value={deadline}
                onChange={event => setDeadline(event.target.value)}
              />
            </label>
            <label className="form-control md:col-span-2">
              <span className="label-text">Bounty description or metadata URI</span>
              <input
                className="input input-bordered"
                value={metadataURI}
                onChange={event => setMetadataURI(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn btn-outline btn-sm" disabled={!connectedAddress || isTxMining} onClick={handleMint}>
              {isTokenTxMining ? "Minting..." : "Mint fake demo money"}
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={!connectedAddress || isTxMining}
              onClick={handleCreateBounty}
            >
              {isEscrowTxMining ? "Creating..." : "Create bounty"}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={!connectedAddress || isTxMining}
              onClick={handleApprove}
            >
              {isTokenTxMining ? "Approving..." : "Approve prize escrow"}
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={!connectedAddress || !bountyId || !hasEnoughAllowance || isTxMining}
              onClick={handleFund}
            >
              {isEscrowTxMining ? "Funding..." : "Fund prize escrow"}
            </button>
            <label className="form-control w-36">
              <span className="label-text">Load bounty ID</span>
              <input
                className="input input-bordered input-sm"
                value={activeBountyId}
                onChange={event => setActiveBountyId(event.target.value.replace(/\D/g, ""))}
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg bg-base-100 p-4 shadow-sm">
          <h2 className="text-xl font-semibold">Hacker</h2>
          <p className="mt-1 text-sm text-base-content/70">
            Add a project submission for demo judging. This stays in localStorage and never touches the smart contract.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="input input-bordered"
              placeholder="Hacker or team name"
              value={submissionForm.hackerName}
              onChange={event => setSubmissionForm(previous => ({ ...previous, hackerName: event.target.value }))}
            />
            <div className="join">
              <input
                className="input input-bordered join-item w-full"
                placeholder="Payout wallet"
                value={submissionForm.payoutWallet}
                onChange={event => setSubmissionForm(previous => ({ ...previous, payoutWallet: event.target.value }))}
              />
              <button
                className="btn join-item"
                disabled={!connectedAddress}
                type="button"
                onClick={() =>
                  connectedAddress && setSubmissionForm(previous => ({ ...previous, payoutWallet: connectedAddress }))
                }
              >
                Mine
              </button>
            </div>
            <input
              className="input input-bordered"
              placeholder="Project URL"
              value={submissionForm.projectUrl}
              onChange={event => setSubmissionForm(previous => ({ ...previous, projectUrl: event.target.value }))}
            />
            <input
              className="input input-bordered"
              placeholder="Short notes"
              value={submissionForm.notes}
              onChange={event => setSubmissionForm(previous => ({ ...previous, notes: event.target.value }))}
            />
          </div>
          <button className="btn btn-secondary btn-sm mt-4" onClick={handleAddSubmission}>
            Add project submission
          </button>
        </section>

        <section className="rounded-lg bg-base-100 p-4 shadow-sm">
          <h2 className="text-xl font-semibold">Judge</h2>
          <p className="mt-1 text-sm text-base-content/70">
            Choose a project submission, then release the prize to its payout wallet. Only the assigned judge wallet can
            release the prize.
          </p>

          <div className="mt-4 grid gap-3">
            {submissions.length === 0 ? (
              <p className="rounded-lg border border-base-300 bg-base-200 p-3 text-sm text-base-content/70">
                No project submissions yet.
              </p>
            ) : (
              submissions.map(submission => (
                <label
                  key={submission.id}
                  className={`cursor-pointer rounded-lg border p-3 text-sm ${
                    selectedSubmissionId === submission.id ? "border-primary bg-primary/10" : "border-base-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      className="radio radio-primary mt-1"
                      checked={selectedSubmissionId === submission.id}
                      onChange={() => setSelectedSubmissionId(submission.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{submission.hackerName}</p>
                        <span className="badge badge-outline">
                          Payout wallet {shortAddress(submission.payoutWallet)}
                        </span>
                      </div>
                      {submission.projectUrl && <p className="break-all">Project: {submission.projectUrl}</p>}
                      {submission.notes && <p className="text-base-content/70">{submission.notes}</p>}
                      <p className="break-all font-mono text-xs text-base-content/60">{submission.payoutWallet}</p>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="mt-4 rounded-lg bg-base-200 p-3 text-sm">
            <p>
              Selected payout wallet:{" "}
              <span className="break-all font-mono">{selectedPayoutWallet || "Choose a submission first"}</span>
            </p>
            <button
              className="btn btn-primary btn-sm mt-3"
              disabled={!connectedAddress || !bountyId || !isFunded || !isJudge || !selectedSubmission || isTxMining}
              onClick={handleAward}
            >
              {isEscrowTxMining ? "Releasing..." : "Release prize"}
            </button>
            {!isJudge && bounty && (
              <p className="mt-2 text-xs text-base-content/60">Connect the judge wallet to release the prize.</p>
            )}
            {txHashes.award && (
              <div className="mt-3 rounded-lg border border-success/40 bg-success/10 p-3">
                <p className="font-semibold">Winner selected and paid</p>
                <p className="break-all">
                  Winner: {bounty?.winner && bounty.winner !== ZERO_ADDRESS ? bounty.winner : selectedPayoutWallet}
                </p>
                <p className="break-all font-mono text-xs">Payout transaction: {txHashes.award}</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg bg-base-100 p-4 shadow-sm">
            <h2 className="text-xl font-semibold">Bounty Status</h2>
            {bounty ? (
              <dl className="mt-3 grid gap-2 text-sm">
                <StatusRow label="Sponsor" value={bounty.sponsor} />
                <StatusRow label="Judge" value={bounty.judge} />
                <StatusRow label="Prize token" value={bounty.token} />
                <StatusRow label="Prize amount" value={`${formatTokenAmount(bounty.amount)} PRIZE`} />
                <StatusRow label="Deadline" value={deadlineDate?.toLocaleString() ?? ""} />
                <StatusRow
                  label="Winner"
                  value={bounty.winner === ZERO_ADDRESS ? "No winner selected yet" : bounty.winner}
                />
                <StatusRow label="Status" value={statusLabel} />
                <StatusRow label="Description" value={bounty.metadataURI} />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-base-content/70">Create or load a bounty to see contract state.</p>
            )}
          </div>

          <div className="rounded-lg bg-base-100 p-4 shadow-sm">
            <h2 className="text-xl font-semibold">Refund</h2>
            <p className="mt-1 text-sm text-base-content/70">
              Sponsors can refund only after the deadline if the prize was funded but not paid.
            </p>
            {bounty && isSponsor && isFunded ? (
              <>
                <button
                  className="btn btn-warning btn-sm mt-3"
                  disabled={!connectedAddress || !bountyId || isTxMining}
                  onClick={handleRefund}
                >
                  {isEscrowTxMining ? "Refunding..." : "Refund sponsor"}
                </button>
                {!deadlinePassed && (
                  <p className="mt-2 text-xs text-base-content/60">
                    The button is visible now, but the contract will reject refunds until the deadline has passed.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-base-content/70">
                Load a funded bounty as the sponsor to see the refund action.
              </p>
            )}
            {txHashes.refund && <TxHash label="Refund transaction" hash={txHashes.refund} />}
          </div>
        </section>

        <section className="rounded-lg bg-base-100 p-4 text-xs text-base-content/60 shadow-sm">
          <p className="font-semibold">Recent transaction hashes</p>
          <div className="mt-2 grid gap-1">
            {Object.entries(txHashes).length === 0 ? (
              <p>No transactions yet.</p>
            ) : (
              Object.entries(txHashes).map(([label, hash]) => <TxHash key={label} label={label} hash={hash} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const StatusRow = ({ label, value }: { label: string; value: string }) => (
  <div className="grid gap-1 border-b border-base-300 pb-2 md:grid-cols-[9rem_1fr]">
    <dt className="font-medium">{label}</dt>
    <dd className="break-all font-mono text-xs md:text-sm">{value}</dd>
  </div>
);

const TxHash = ({ label, hash }: { label: string; hash: string }) => (
  <p className="break-all text-xs text-base-content/70">
    {label}: <span className="font-mono">{hash}</span>
  </p>
);

export default Home;
