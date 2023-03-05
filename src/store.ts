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
  fontSize: 18,
  lineHeight: 2,
  theme: 'default'
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
  singleColumnMode: false,
  showMenu: false,
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
    // this.txtContent = book.contents
    this.chapters = book.chapters
    this.page = book.history.page
    this.currentChapterIndex = book.history.chapterIndex
  },
  prevPage() {
    if (store.page > 0) {
      store.page = store.page - 1
    } else if (store.currentChapterIndex > 0) {
      store.currentChapterIndex -= 1
      store.page = currentChapterTitle.value.maxPage || 0
    }
  },
  nextPage() {
    if (store.page < store.maxPage) {
      store.page = store.page + 1
    } else if (store.currentChapterIndex < store.chapters.length - 1) {
      store.page = 0
      store.currentChapterIndex += 1
    }
  },
  storeHistory() {
    if (store.currentTxt && currentBook && currentBook.value?.history) {
      currentBook.value.history = { page: store.page, chapterIndex: store.currentChapterIndex }
      const book = currentBook.value
      // localStorage.setItem('bookshelf', JSON.stringify(store.bookshelf))
      dbPromise.then(db => {
        db.put('bookshelf', {
          title: book.title,
          chapters: JSON.stringify(book.chapters),
          // contents: JSON.stringify(book.contents),
          history: JSON.stringify(book.history)
        })
      })
    }
  },
  nextChapter() {
    if (this.currentChapterIndex < this.chapters.length - 1) {
      this.page = 0
      this.currentChapterIndex++
    }
  },
  prevChapter() {
    if (this.currentChapterIndex > 0) {
      this.page = 0
      this.currentChapterIndex--
    }
  }
}

export const store = reactive<StoreType>(defaultState)

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
