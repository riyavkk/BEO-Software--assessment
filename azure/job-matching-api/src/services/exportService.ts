import { SearchResult, JobListing } from '../types';
import { featureFlags } from '../config/featureFlags';
import { sendEvent } from '../config/azureServiceBus';

export class ExportService {
  /**
   * Export search results to CSV
   */
  async exportToCSV(searchResult: SearchResult): Promise<string> {
    if (!featureFlags.enableExportService) {
      throw new Error('Export service is disabled');
    }

    const headers = [
      'ID',
      'Title',
      'Company',
      'Location',
      'Skills',
      'Salary Min',
      'Salary Max',
      'Created At',
    ];

    const rows = searchResult.jobListings.map((job: JobListing) => [
      job.id,
      this.escapeCSV(job.title),
      this.escapeCSV(job.company),
      this.escapeCSV(job.location),
      this.escapeCSV(job.skills.join(', ')),
      job.salaryMin?.toString() || '',
      job.salaryMax?.toString() || '',
      job.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Send export event
    await sendEvent('job.export', {
      format: 'csv',
      recordCount: searchResult.jobListings.length,
    });

    return csvContent;
  }

  /**
   * Escape CSV field values
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

