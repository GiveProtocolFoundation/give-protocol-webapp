import React, { useCallback, useMemo } from "react";
import { Download, ExternalLink, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Transaction } from "@/types/contribution";
import { formatDate } from "@/utils/date";
import { useTranslation } from "@/hooks/useTranslation";
import { CurrencyDisplay } from "@/components/CurrencyDisplay";

interface SortConfig {
  key: "date" | "type" | "status" | "organization" | null;
  direction: "asc" | "desc";
}

type SortKey = "date" | "type" | "status" | "organization";

interface TransactionsTabProps {
  transactions: Transaction[];
  sortConfig: SortConfig;
  onSort: (_sortKey: SortKey) => void;
  onShowExportModal: () => void;
}

const STATUS_CLASSES: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
};

/** Mission-specific minimal line-art: two hands sharing a token. */
function SharedTokenIllustration(): React.ReactElement {
  return (
    <svg
      width="120"
      height="96"
      viewBox="0 0 120 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="mx-auto text-emerald-500"
    >
      {/* Token (circle with heart inside) */}
      <circle
        cx="60"
        cy="38"
        r="14"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="none"
      />
      <path
        d="M60 44.5 L54.5 39.5 C53 38 53 35.7 54.5 34.2 C56 32.7 58.3 32.7 59.8 34.2 L60 34.4 L60.2 34.2 C61.7 32.7 64 32.7 65.5 34.2 C67 35.7 67 38 65.5 39.5 Z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* Sparkle ticks above the token */}
      <path
        d="M60 18 V22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M48 22 L50 25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M72 22 L70 25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Left hand - cupped */}
      <path
        d="M14 70 C14 62 22 56 30 58 L46 62 C50 63 52 66 51 70 L48 80 C47 84 43 86 39 85 L20 81 C16 80 14 76 14 72 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M30 58 V52"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M36 60 V53"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M42 61 V55"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Right hand - cupped (mirrored) */}
      <path
        d="M106 70 C106 62 98 56 90 58 L74 62 C70 63 68 66 69 70 L72 80 C73 84 77 86 81 85 L100 81 C104 80 106 76 106 72 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M90 58 V52"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M84 60 V53"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M78 61 V55"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Sortable column headers for the transactions table. */
function TransactionTableHeader({
  getSortIcon,
  onSortDate,
  onSortType,
  onSortOrganization,
  onSortStatus,
  t,
}: {
  getSortIcon: (_key: SortKey) => React.ReactNode;
  onSortDate: () => void;
  onSortType: () => void;
  onSortOrganization: () => void;
  onSortStatus: () => void;
  t: (_key: string, _fallback?: string) => string;
}): React.ReactElement {
  return (
    <thead className="bg-gray-50">
      <tr>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
          onClick={onSortDate}
        >
          <span className="flex items-center gap-1">
            {t("contributions.date")}
            {getSortIcon("date")}
          </span>
        </th>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
          onClick={onSortType}
        >
          <span className="flex items-center gap-1">
            {t("contributions.type")}
            {getSortIcon("type")}
          </span>
        </th>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
          onClick={onSortOrganization}
        >
          <span className="flex items-center gap-1">
            {t("donor.volunteer", "Donor/Volunteer")}
            {getSortIcon("organization")}
          </span>
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          {t("contributions.details")}
        </th>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
          onClick={onSortStatus}
        >
          <span className="flex items-center gap-1">
            {t("contributions.status")}
            {getSortIcon("status")}
          </span>
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          {t("contributions.verification")}
        </th>
      </tr>
    </thead>
  );
}

/** Mobile card for a single transaction record. */
function TransactionMobileCard({
  transaction,
  t,
}: {
  transaction: Transaction;
  t: (_key: string, _fallback?: string) => string;
}): React.ReactElement {
  const organization =
    transaction.metadata?.organization ||
    transaction.metadata?.donor ||
    t("donor.anonymous", "Anonymous");
  const statusClass =
    STATUS_CLASSES[transaction.status] || "bg-red-100 text-red-800";
  const statusLabel =
    transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1);

  return (
    <div className="p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {t(
              `contribution.type.${transaction.purpose.toLowerCase().replace(" ", "")}`,
              transaction.purpose,
            )}
          </p>
          <p className="text-xs text-gray-500">
            {formatDate(transaction.timestamp, true)}
          </p>
        </div>
        <span
          className={`px-2.5 py-1 text-xs leading-5 font-semibold rounded-full ${statusClass}`}
        >
          {t(`status.${transaction.status}`, statusLabel)}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-900">
          {transaction.amount} {transaction.cryptoType}
        </span>
        <span className="text-gray-500">
          <CurrencyDisplay amount={transaction.fiatValue || 0} />
        </span>
      </div>
      <p className="text-xs text-gray-500">{organization}</p>
      {transaction.hash && (
        <a
          href={`https://moonscan.io/tx/${transaction.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-600 hover:text-emerald-900 flex items-center gap-1"
        >
          <span className="truncate max-w-[160px]">
            {transaction.hash.substring(0, 20)}...
          </span>
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      )}
    </div>
  );
}

/** Single transaction row with formatted date, status badge, and verification link. */
function TransactionRow({
  transaction,
  t,
}: {
  transaction: Transaction;
  t: (_key: string, _fallback?: string) => string;
}): React.ReactElement {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(transaction.timestamp, true)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {t(
          `contribution.type.${transaction.purpose.toLowerCase().replace(" ", "")}`,
          transaction.purpose,
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {transaction.metadata?.organization ||
          transaction.metadata?.donor ||
          t("donor.anonymous", "Anonymous")}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <span className="font-medium">
          {transaction.amount} {transaction.cryptoType}
        </span>
        <span className="text-gray-500 ml-1">
          (<CurrencyDisplay amount={transaction.fiatValue || 0} />)
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_CLASSES[transaction.status] || "bg-red-100 text-red-800"}`}
        >
          {t(
            `status.${transaction.status}`,
            transaction.status.charAt(0).toUpperCase() +
              transaction.status.slice(1),
          )}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {transaction.hash ? (
          <a
            href={`https://moonscan.io/tx/${transaction.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1"
          >
            <span className="truncate max-w-[100px]">
              {transaction.hash.substring(0, 10)}...
            </span>
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          t("common.notAvailable", "N/A")
        )}
      </td>
    </tr>
  );
}

/**
 * Tab displaying sortable transaction history with export capability.
 * @param props - Transaction data, sort config, and callbacks
 * @returns Rendered transactions table or empty state
 */
export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  sortConfig,
  onSort,
  onShowExportModal,
}) => {
  const { t } = useTranslation();

  const handleSortByDate = useCallback(() => onSort("date"), [onSort]);
  const handleSortByType = useCallback(() => onSort("type"), [onSort]);
  const handleSortByOrganization = useCallback(
    () => onSort("organization"),
    [onSort],
  );
  const handleSortByStatus = useCallback(() => onSort("status"), [onSort]);

  const getSortIcon = useCallback(
    (columnKey: "date" | "type" | "status" | "organization") => {
      if (sortConfig.key !== columnKey) {
        return <ChevronUp className="h-4 w-4 text-gray-300" />;
      }
      return sortConfig.direction === "asc" ? (
        <ChevronUp className="h-4 w-4 text-gray-600" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-600" />
      );
    },
    [sortConfig],
  );

  const sortedTransactions = useMemo(() => {
    if (!sortConfig.key) return transactions;

    return [...transactions].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortConfig.key) {
        case "date":
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case "type":
          aValue = a.purpose.toLowerCase();
          bValue = b.purpose.toLowerCase();
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "organization":
          aValue = (
            a.metadata?.organization ||
            a.metadata?.donor ||
            "Anonymous"
          ).toLowerCase();
          bValue = (
            b.metadata?.organization ||
            b.metadata?.donor ||
            "Anonymous"
          ).toLowerCase();
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const compareResult = aValue.localeCompare(bValue);
        return sortConfig.direction === "asc" ? compareResult : -compareResult;
      }
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [transactions, sortConfig]);

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("charity.transactions")}
          </h2>
          <Button
            onClick={onShowExportModal}
            variant="secondary"
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            {t("contributions.export")}
          </Button>
        </div>
        <div className="py-16 px-6 text-center">
          <SharedTokenIllustration />
          <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-6">
            {t(
              "transactions.noTransactionsYet",
              "Ready to receive your first gift",
            )}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            {t(
              "transactions.noTransactionsDescription",
              "Create your first campaign to see donations arrive here.",
            )}
          </p>
          <Link
            to="/charity-portal/create-cause"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-[10px] shadow-cta hover:shadow-[0_4px_18px_rgba(5,150,105,0.5)] transform hover:-translate-y-0.5 transition-all"
          >
            {t("transactions.createCampaign", "Create your first campaign")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("charity.transactions")}
        </h2>
        <Button
          onClick={onShowExportModal}
          variant="secondary"
          className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
        >
          <Download className="h-4 w-4 text-emerald-600" />
          {t("contributions.export")}
        </Button>
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <caption className="sr-only">Transaction history</caption>
          <TransactionTableHeader
            getSortIcon={getSortIcon}
            onSortDate={handleSortByDate}
            onSortType={handleSortByType}
            onSortOrganization={handleSortByOrganization}
            onSortStatus={handleSortByStatus}
            t={t}
          />
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden divide-y divide-gray-200">
        {sortedTransactions.map((transaction) => (
          <TransactionMobileCard
            key={transaction.id}
            transaction={transaction}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};

export default TransactionsTab;
