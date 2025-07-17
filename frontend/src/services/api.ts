import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, Project, Job, SystemStatus, LogFile, VsimResultSummary } from '../types';
import { API_BASE_URL } from '../config/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        if (error.response?.data?.details) {
          console.error('Validation Details:', error.response.data.details);
        }
        return Promise.reject(error);
      }
    );
  }

  // System endpoints
  async getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
    try {
      console.log('🔍 API: Requesting system status from:', `${API_BASE_URL}/api/system/status`);
      const response = await this.api.get('/api/system/status');
      console.log('✅ API: System status response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ API: System status request failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      throw error;
    }
  }

  async getSystemStatistics(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/api/system/statistics');
      return response.data;
    } catch (error: any) {
      console.error('❌ API: System statistics request failed:', error);
      throw error;
    }
  }

  // Project endpoints
  async getProjects(): Promise<ApiResponse<Project[]>> {
    // Add cache-busting parameter to avoid stale data
    const timestamp = Date.now();
    const response = await this.api.get(`/api/projects?_t=${timestamp}`);
    return response.data;
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    const response = await this.api.get(`/api/projects/${id}`);
    return response.data;
  }

  async createProject(formData: FormData): Promise<ApiResponse<Project>> {
    const response = await this.api.post('/api/projects', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    const response = await this.api.delete(`/api/projects/${id}`);
    return response.data;
  }

  // Update project file
  async updateProjectFile(projectId: string, filePath: string, content: string): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/api/projects/${projectId}/files/${filePath}`, {
      content
    });
    return response.data;
  }

  async parseTestPlan(formData: FormData): Promise<ApiResponse<any>> {
    const response = await this.api.post('/api/projects/parse-testplan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async uploadTestPlanToProject(projectId: string, formData: FormData): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/api/projects/${projectId}/testplan`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Job endpoints
  async getJobs(projectId?: string): Promise<ApiResponse<Job[]>> {
    const params = projectId ? { projectId } : {};
    const response = await this.api.get('/api/jobs', { params });
    return response.data;
  }

  async getJob(id: string): Promise<ApiResponse<Job>> {
    const response = await this.api.get(`/api/jobs/${id}`);
    return response.data;
  }

  async compileProject(projectId: string): Promise<ApiResponse<Job>> {
    const response = await this.api.post('/api/jobs/compile', { projectId });
    return response.data;
  }

  async simulateProject(projectId: string, options?: any): Promise<ApiResponse<Job>> {
    const response = await this.api.post(`/api/jobs/simulation/${projectId}`, {
      config: {
        dutTop: options?.testbench || 'tb_top',
        timeout: parseInt(options?.timeout || '60') * 60, // Convert minutes to seconds
        simulationTime: options?.simulationTime || 'run -all',
        compileOptions: options?.compileOptions || '',
        includeDirectories: ['./src', './tb', './include']
      }
    });
    return response.data;
  }

  async formalVerification(projectId: string, options?: any): Promise<ApiResponse<Job>> {
    const response = await this.api.post(`/api/jobs/formal/${projectId}`, {
      config: {
        dutTop: options?.testbench || 'top_temp',
        formalMode: options?.formalMode || 'lint', // Use passed formalMode
        timeout: parseInt(options?.timeout || '60') * 60, // Convert minutes to seconds
        compileOptions: options?.compileOptions || '',
        includeDirectories: ['./src', './tb', './include']
      }
    });
    return response.data;
  }

  async cancelJob(id: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/api/jobs/${id}/cancel`);
    return response.data;
  }

  async forceDeleteJob(id: string): Promise<ApiResponse<void>> {
    const response = await this.api.delete(`/api/jobs/${id}/force`);
    return response.data;
  }

  // File endpoints
  async downloadResults(jobId: string, filename: string): Promise<Blob> {
    const response = await this.api.get(`/api/files/results/${jobId}/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Get job logs (legacy method - keeping for backward compatibility)
  async getLogFile(jobId: string): Promise<string> {
    try {
      const response = await this.api.get(`/api/jobs/${jobId}/logs`);
      if (response.data.success && response.data.data) {
        // Return combined logs from all log files
        return response.data.data.logFiles.map((file: any) => 
          `=== ${file.description} ===\n${file.content || 'Log file not available'}\n`
        ).join('\n');
      }
    } catch (error) {
      console.error('Failed to get legacy log file:', error);
    }
    return 'No logs available';
  }

  // Get list of available log files for a job
  async getJobLogFiles(jobId: string): Promise<ApiResponse<{ logFiles: LogFile[] }>> {
    try {
      const response = await this.api.get(`/api/jobs/${jobId}/logs`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get log files'
      };
    }
  }

  // Get content of a specific log file
  async getLogFileContent(jobId: string, filename: string): Promise<ApiResponse<{ content: string, filename: string }>> {
    try {
      const response = await this.api.get(`/api/jobs/${jobId}/logs/${filename}`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get log file content'
      };
    }
  }

  // Get content of a specific source file for a job
  async getSourceFileContent(jobId: string, filename: string): Promise<ApiResponse<{ content: string, filename: string }>> {
    try {
      const response = await this.api.get(`/api/jobs/${jobId}/src/${filename}`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get source file content'
      };
    }
  }

  // Get download URL for a log file
  getLogFileDownloadUrl(jobId: string, filename: string): string {
    return `${API_BASE_URL}/api/jobs/${jobId}/logs/${filename}/download`;
  }

  async getLintReport(jobId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/jobs/${jobId}/lint-report`);
    return response.data;
  }

  async getCDCReport(jobId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/jobs/${jobId}/cdc-report`);
    return response.data;
  }

  // Get test results from a simulation job
  async getJobTestResults(jobId: string): Promise<ApiResponse<VsimResultSummary>> {
    const response = await this.api.get(`/api/jobs/${jobId}/test-results`);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService; 