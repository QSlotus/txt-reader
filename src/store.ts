// store.js
import { computed, nextTick, reactive, watch } from 'vue'
import { dbPromise } from '@/db'

type StoreType = {
  // props
  showChapters: boolean;
  showBookmarks: boolean;
  singleColumnMode: boolean;
  showMenu: boolean;
  // txtContent: string[];
  chapters: IChapter[];
  currentChapterIndex: number;
  currentTxt?: string;
  page: number;
  maxPage: number;
  bookshelf: IBook[];
  bookmarks: IBookmark[];
  settings: { [key: string]: any };
  showSettings: boolean;
  isAnimating: boolean;

  // methods
  switchShowChapters(): void;
  switchSettings(): void;
  switchColumnMode(): void;
  switchShowBookmarks(): void;
  addBookmark(): void;
  backToBookshelf(): void;
  switchShowMenu(): void;
  addToBookshelf(): IBook;
  removeBook(book: IBook): void;
  read(book: IBook): void;
  removeBookmark(bookmark: IWatchHistory): void;
  prevPage(): void;
  nextPage(): void;
  storeHistory(): void;
  prevChapter(): void;
  nextChapter(): void;
}

let bookshelf: IBook[] = []
// try {
//   bookshelf = JSON.parse(localStorage.getItem('bookshelf') || '[]')
// } catch (e) {
// }

let bookmarks: IBookmark[] = []
try {
  bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]')
} catch (e) {
}

const defaultSettings = {
  fontSize: 42,
  lineHeight: 72,
  theme: 'default'
}

function getStorage(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch (e) {
    return null
  }
}

let settings = {}
try {
  settings = JSON.parse(localStorage.getItem('settings') || '{}')
} catch (e) {
}

const defaultState: StoreType = {
  showChapters: false,
  showBookmarks: false,
  showSettings: false,
  singleColumnMode: getStorage('singleColumnMode') ?? true,
  showMenu: false,
  isAnimating: false,
  // txtContent: [],
  chapters: [],
  currentChapterIndex: 0,
  currentTxt: undefined,
  page: 0,
  maxPage: 0,
  bookshelf,
  bookmarks,
  settings: Object.assign({}, defaultSettings, settings),
  switchShowChapters() {
    if (!currentBook.value) return
    this.showChapters = !this.showChapters
  },
  switchSettings() {
    this.showSettings = !this.showSettings
  },
  switchColumnMode() {
    this.singleColumnMode = !this.singleColumnMode
    localStorage.setItem('singleColumnMode', JSON.stringify(this.singleColumnMode))
  },
  switchShowBookmarks() {
    if (!currentBook.value) return
    this.showBookmarks = !this.showBookmarks
  },
  switchShowMenu() {
    this.showMenu = !this.showMenu
  },
  addBookmark() {
    if (!currentBook.value) return
    const index = this.bookmarks.findIndex(i => i.title === this.currentTxt)
    const history: IWatchHistory = {
      page: this.page,
      chapterIndex: this.currentChapterIndex
    }
    if (index === -1) {
      this.bookmarks.push({
        title: this.currentTxt!,
        histories: [history]
      })
    } else {
      if (this.bookmarks[index].histories.find(i => i.page === history.page && i.chapterIndex === history.chapterIndex)) {
        return
      }
      this.bookmarks[index].histories.push(history)
    }
    localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks))
  },
  backToBookshelf() {
    this.storeHistory()
    this.currentTxt = undefined
    // this.txtContent = []
    this.chapters = []
    this.currentChapterIndex = 0
    this.page = 0
    this.showBookmarks = false
    this.showChapters = false
    this.showMenu = false
    this.showSettings = false
    this.isAnimating = false
  },
  addToBookshelf() {
    const index = this.bookshelf.findIndex(i => i.title === this.currentTxt)
    const data: IBook = {
      title: this.currentTxt!,
      chapters: this.chapters,
      // contents: this.txtContent,
      history: {
        page: this.page,
        chapterIndex: this.currentChapterIndex
      }
    }
    if (index !== -1) {
      this.bookshelf[index] = data
    } else {
      this.bookshelf.push(data)
    }
    dbPromise.then(db => {
      console.log(data)
      db.put('bookshelf', {
        title: data.title,
        chapters: JSON.stringify(data.chapters),
        // contents: JSON.stringify(data.contents),
        history: JSON.stringify(data.history)
      })
    })
    return data
    // localStorage.setItem('bookshelf', JSON.stringify(this.bookshelf))
  },
  removeBook(book: IBook) {
    const index = this.bookshelf.indexOf(book)
    this.bookshelf.splice(index, 1)
    dbPromise.then(db => {
      db.delete('bookshelf', book.title)
    })
    // localStorage.setItem('bookshelf', JSON.stringify(this.bookshelf))
  },
  removeBookmark(bookmark: IWatchHistory) {
    const index = currentBookMarks.value.indexOf(bookmark)
    currentBookMarks.value.splice(index, 1)
    localStorage.setItem('bookmarks', JSON.stringify(store.bookmarks))
  },
  read(book: IBook) {
    this.currentTxt = book.title
    this.chapters = book.chapters

    // 优先从 localStorage 获取最新阅读位置
    const histories = JSON.parse(localStorage.getItem('bookHistories') || '{}')
    const savedHistory = histories[book.title]

    currentPage.value = savedHistory?.page ?? book.history?.page ?? 0
    this.currentChapterIndex = savedHistory?.chapterIndex ?? book.history?.chapterIndex ?? 0
  },
  prevPage() {
    if (store.isAnimating) return
    if (currentPage.value > 0) {
      currentPage.value = currentPage.value - 1
    } else if (store.currentChapterIndex > 0) {
      store.currentChapterIndex -= 1
      currentPage.value = currentChapterTitle.value.maxPage || 0
    }
  },
  nextPage() {
    if (store.isAnimating) return
    if (currentPage.value < store.maxPage) {
      currentPage.value = currentPage.value + 1
    } else if (store.currentChapterIndex < store.chapters.length - 1) {
      currentPage.value = 0
      store.currentChapterIndex += 1
    }
  },
  async storeHistory() {
    if (store.currentTxt && currentBook.value) {
      const history = {
        page: currentPage.value,
        chapterIndex: store.currentChapterIndex
      }
      // 更新内存中的 history
      currentBook.value.history = history
      // 保存到 localStorage
      saveHistoryToLocalStorage(currentBook.value.title, history)
    }
  },
  nextChapter() {
    if (this.currentChapterIndex < this.chapters.length - 1) {
      currentPage.value = 0
      this.currentChapterIndex++
    }
  },
  prevChapter() {
    if (this.currentChapterIndex > 0) {
      currentPage.value = 0
      this.currentChapterIndex--
    }
  }
}

function saveHistoryToLocalStorage(title: string, history: { page: number; chapterIndex: number }) {
  const histories = JSON.parse(localStorage.getItem('bookHistories') || '{}')
  histories[title] = history
  localStorage.setItem('bookHistories', JSON.stringify(histories))
}

export const store = reactive<StoreType>(defaultState)

export const currentPage = computed({
  get() {
    return store.page
  },
  set(val: number) {
    if (store.isAnimating) return
    store.page = val
  }
})


export const currentChapterTitle = computed(() => {
  return store.chapters[store.currentChapterIndex]
})
export const currentBookMarks = computed<IWatchHistory[]>(() => store.bookmarks.find(i => i.title === store.currentTxt)?.histories || [])

export const currentChapter = computed(() => {
  return store.chapters[store.currentChapterIndex]?.contents || []
})

export const currentBook = computed(() => store.bookshelf.find(i => i.title === store.currentTxt))

watch(() => store.settings, () => {
  localStorage.setItem('settings', JSON.stringify(store.settings))
}, {
  deep: true
})


watch(() => store.currentChapterIndex, () => {
  store.maxPage = store.chapters[store.currentChapterIndex]?.maxPage || 0
  store.storeHistory()
})

watch(currentPage, () => {
  store.storeHistory()
})
