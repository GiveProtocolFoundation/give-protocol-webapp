import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { formatDate } from "./date";
import { convertToCSV, downloadCSV } from "./csvHelpers";

/** Donation leaderboard row used for export formatting. */
export interface DonationLeaderData {
  rank: number;
  displayName: string;
  totalDonated: number;
  alias?: string;
}

/** Volunteer leaderboard row used for export formatting. */
export interface VolunteerLeaderData {
  rank: number;
  displayName: string;
  hours: number;
  endorsements: number;
  skills: string[];
  alias?: string;
}

/** Options for leaderboard CSV/PDF export. */
export interface LeaderboardExportOptions {
  timeRange: string;
  region: string;
  filename?: string;
  includeTimestamp?: boolean;
}

/**
 * Formats donation leaderboard data for CSV export
 * @param data Array of donation leaders
 * @returns Formatted data ready for CSV export
 */
export function formatDonationLeaderboardForCSV(
  data: DonationLeaderData[],
): Record<string, unknown>[] {
  return data.map((leader) => ({
    Rank: leader.rank,
    "Contributor Name": leader.displayName,
    "Total Donated (USD)": `$${leader.totalDonated.toLocaleString()}`,
    "Wallet Alias": leader.alias || "N/A",
  }));
}

/**
 * Formats volunteer leaderboard data for CSV export
 * @param data Array of volunteer leaders
 * @returns Formatted data ready for CSV export
 */
export function formatVolunteerLeaderboardForCSV(
  data: VolunteerLeaderData[],
): Record<string, unknown>[] {
  return data.map((leader) => ({
    Rank: leader.rank,
    "Volunteer Name": leader.displayName,
    "Hours Contributed": leader.hours,
    Endorsements: leader.endorsements,
    Skills: leader.skills.join(", "),
    "Wallet Alias": leader.alias || "N/A",
  }));
}

/**
 * Exports donation leaderboard data to CSV
 * @param data Array of donation leaders
 * @param options Export options
 */
export function exportDonationLeaderboardToCSV(
  data: DonationLeaderData[],
  options: LeaderboardExportOptions,
): void {
  const formattedData = formatDonationLeaderboardForCSV(data);
  const csvData = convertToCSV(formattedData);

  const timestamp =
    options.includeTimestamp !== false
      ? `_${new Date().toISOString().split("T")[0]}`
      : "";
  const filename =
    options.filename ||
    `donation_leaderboard_${options.timeRange}_${options.region}${timestamp}.csv`;

  downloadCSV(csvData, filename);
}

/**
 * Exports volunteer leaderboard data to CSV
 * @param data Array of volunteer leaders
 * @param options Export options
 */
export function exportVolunteerLeaderboardToCSV(
  data: VolunteerLeaderData[],
  options: LeaderboardExportOptions,
): void {
  const formattedData = formatVolunteerLeaderboardForCSV(data);
  const csvData = convertToCSV(formattedData);

  const timestamp =
    options.includeTimestamp !== false
      ? `_${new Date().toISOString().split("T")[0]}`
      : "";
  const filename =
    options.filename ||
    `volunteer_leaderboard_${options.timeRange}_${options.region}${timestamp}.csv`;

  downloadCSV(csvData, filename);
}

/**
 * Captures an HTML element as a canvas and adds it to a PDF
 * @param element HTML element to capture
 * @param pdf jsPDF instance
 * @param title Title for the section
 * @param yPosition Starting Y position
 * @returns Promise with the new Y position after adding content
 */
async function captureElementToPDF(
  element: HTMLElement,
  pdf: jsPDF,
  title: string,
  yPosition: number,
): Promise<number> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 190; // A4 width minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add title
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, 10, yPosition);
    yPosition += 10;

    // Check if we need a new page
    if (yPosition + imgHeight > 280) {
      // A4 height minus margins
      pdf.addPage();
      yPosition = 20;
    }

    // Add image
    pdf.addImage(imgData, "PNG", 10, yPosition, imgWidth, imgHeight);

    return yPosition + imgHeight + 20; // Add some spacing after the image
  } catch (error) {
    console.error("Error capturing element to PDF:", error);
    return yPosition;
  }
}

/**
 * Exports leaderboard data to PDF
 * @param donationElement DOM element containing donation leaderboard
 * @param volunteerElement DOM element containing volunteer leaderboard
 * @param options Export options
 */
export async function exportLeaderboardToPDF(
  donationElement: HTMLElement | null,
  volunteerElement: HTMLElement | null,
  options: LeaderboardExportOptions,
): Promise<void> {
  const pdf = new jsPDF();
  let yPosition = 20;

  // Add header
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("Global Impact Rankings", 10, yPosition);
  yPosition += 15;

  // Add export info
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Generated on: ${formatDate(new Date().toISOString(), true)}`,
    10,
    yPosition,
  );
  yPosition += 5;
  pdf.text(`Time Range: ${options.timeRange}`, 10, yPosition);
  yPosition += 5;
  pdf.text(`Region: ${options.region}`, 10, yPosition);
  yPosition += 15;

  // Capture donation leaderboard if available
  if (donationElement) {
    yPosition = await captureElementToPDF(
      donationElement,
      pdf,
      "Donation Rankings",
      yPosition,
    );
  }

  // Capture volunteer leaderboard if available
  if (volunteerElement) {
    // Add new page if we already have donation data
    if (donationElement) {
      pdf.addPage();
      yPosition = 20;
    }

    await captureElementToPDF(
      volunteerElement,
      pdf,
      "Volunteer Rankings",
      yPosition,
    );
  }

  // Generate filename
  const timestamp =
    options.includeTimestamp !== false
      ? `_${new Date().toISOString().split("T")[0]}`
      : "";
  const filename =
    options.filename ||
    `impact_rankings_${options.timeRange}_${options.region}${timestamp}.pdf`;

  // Download the PDF
  pdf.save(filename);
}

/**
 * Gets the current data from leaderboard components for export
 * @param _donationComponent Reference to donation leaderboard component
 * @param _volunteerComponent Reference to volunteer leaderboard component
 * @returns Object containing both datasets
 */
export function getLeaderboardDataForExport(
  _donationComponent: HTMLElement | null,
  _volunteerComponent: HTMLElement | null,
): {
  donationData: DonationLeaderData[];
  volunteerData: VolunteerLeaderData[];
} {
  // This is a simplified implementation - in a real scenario,
  // we would need to access the actual component state/data
  // For now, we'll return empty arrays and rely on DOM capture for PDFs

  return {
    donationData: [],
    volunteerData: [],
  };
}
