export interface ContentTree {
    id: string;
    title: string;
    type: ContentType;
    status: ContentStatus;
    order: number;
    children?: ContentTree[];
  }
  
  export interface ContentWithVersions {
    id: string;
    title: string;
    type: ContentType;
    status: ContentStatus;
    content: any;
    currentVersion: number;
    versions: Array<{
      version: number;
      createdAt: Date;
      createdBy: string;
      changelog?: string;
    }>;
  }
  
  export interface MediaUploadResult {
    id: string;
    filename: string;
    url: string;
    type: MediaType;
    size: number;
  }