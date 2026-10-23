/** Describes the content rendered by the Brewly terminal notice card. */
export interface NoticeContent {
  command: string;
  currentVersion?: string;
  detail?: string;
  latestVersion?: string;
  message: string;
}
