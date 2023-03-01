interface WatchHistory {
  page: number
  chapterIndex: number
}

interface Book {
  title: string;
  chapters: string[];
  contents: string[];
  history: WatchHistory;
  showDelete?: boolean;
}
interface Bookmark {
  title: string;
  histories: WatchHistory[]
}

