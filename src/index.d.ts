interface IWatchHistory {
  page: number
  chapterIndex: number
}

interface IChapter {
  splitPages?: readonly string[][]
  title: string
  contents: string[]
  maxPage?: number
}

interface IBook {
  title: string;
  chapters: IChapter[];
  // contents: string[];
  history: IWatchHistory;
  showDelete?: boolean;
}

interface IBookmark {
  title: string;
  histories: IWatchHistory[]
}

