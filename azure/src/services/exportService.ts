import { SearchResult, JobListing } from '../types';
import { featureFlags } from '../config/featureFlags';
import { sendEvent } from '../config/azureServiceBus';

export class ExportService {

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
      job.id ?? '',
      this.escapeCSV(job.title ?? ''),
      this.escapeCSV(job.company ?? ''),
      this.escapeCSV(job.location ?? ''),
      this.escapeCSV(Array.isArray(job.skills) ? job.skills.join(', ') : ''),
      job.salaryMin?.toString() || '',
      job.salaryMax?.toString() || '',
      job.createdAt instanceof Date
        ? job.createdAt.toISOString()
        : new Date(job.createdAt).toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    await sendEvent('job.export', {
      format: 'csv',
      recordCount: searchResult.jobListings.length,
      timestamp: new Date().toISOString(),
    });

    return csvContent;
  }

  /**
   * Safely escape CSV field values (wrap in quotes if needed)
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
