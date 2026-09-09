export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HelpArticleFormData {
  id: string | null;
  title: string;
  content: string;
  category: string;
  order: string;
  isActive: boolean;
}
