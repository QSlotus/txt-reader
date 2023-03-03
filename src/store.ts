// store.js
import { computed, nextTick, reactive, watch } from 'vue'
import { dbPromise } from '@/db'

type StoreType = {
  // props
  showChapters: boolean;
  showBookmarks: boolean;
  singleColumnMode: boolean;
  showMenu: boolean;
  txtContent: string[];
  chapters: string[];
  currentChapterIndex: number;
  currentTxt?: string;
  page: number;
  maxPage: number;
  bookshelf: Book[];
  bookmarks: Bookmark[];
  settings: { [key: string]: any };
  showSettings: boolean;

  // methods
  switchShowChapters: () => void;
  switchSettings: () => void;
  switchColumnMode: () => void;
  switchShowBookmarks: () => void;
  addBookmark: () => void;
  backToBookshelf: () => void;
  switchShowMenu: () => void;
  addToBookshelf: () => void;
  removeBook: (book: Book) => void;
  read: (book: Book) => void;
  removeBookmark: (bookmark: WatchHistory) => void;
  prevPage: () => void;
  nextPage: () => void;
  storeHistory(): void
}

let bookshelf: Book[] = []
// try {
//   bookshelf = JSON.parse(localStorage.getItem('bookshelf') || '[]')
// } catch (e) {
// }

let bookmarks: Bookmark[] = []
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

export const store = reactive<StoreType>({
  showChapters: false,
  showBookmarks: false,
  showSettings: false,
  singleColumnMode: false,
  showMenu: false,
  txtContent: [],
  chapters: [],
  currentChapterIndex: 0,
  currentTxt: undefined,
  page: 0,
  maxPage: 0,
  bookshelf,
  bookmarks,
  settings: Object.assign({}, defaultSettings, settings),
  switchShowChapters() {
    this.showChapters = !this.showChapters
  },
  switchSettings() {
    this.showSettings = !this.showSettings
  },
  switchColumnMode() {
    this.singleColumnMode = !this.singleColumnMode
  },
  switchShowBookmarks() {
    this.showBookmarks = !this.showBookmarks
  },
  switchShowMenu() {
    this.showMenu = !this.showMenu
  },
  addBookmark() {
    if (this.txtContent.length <= 0) {
      return
    }
    const index = this.bookmarks.findIndex(i => i.title === this.currentTxt)
    const history: WatchHistory = {
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
    this.txtContent = []
    this.chapters = []
    this.currentChapterIndex = 0
    this.page = 0
  },
  addToBookshelf() {
    const index = this.bookshelf.findIndex(i => i.title === this.currentTxt)
    const data = {
      title: this.currentTxt!,
      chapters: this.chapters,
      contents: this.txtContent,
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
        contents: JSON.stringify(data.contents),
        history: JSON.stringify(data.history)
      })
    })
    // localStorage.setItem('bookshelf', JSON.stringify(this.bookshelf))
  },
  removeBook(book: Book) {
    const index = this.bookshelf.indexOf(book)
    this.bookshelf.splice(index, 1)
    dbPromise.then(db => {
      db.delete('bookshelf', book.title)
    })
    // localStorage.setItem('bookshelf', JSON.stringify(this.bookshelf))
  },
  removeBookmark(bookmark: WatchHistory) {
    const index = currentBookMarks.value.indexOf(bookmark)
    currentBookMarks.value.splice(index, 1)
    localStorage.setItem('bookmarks', JSON.stringify(store.bookmarks))
  },
  read(book: Book) {
    this.currentTxt = book.title
    this.txtContent = book.contents
    this.chapters = book.chapters
    this.page = book.history.page
    this.currentChapterIndex = book.history.chapterIndex
  },
  prevPage() {
    if (store.page > 0) {
      store.page = store.page - 1
    } else if (store.currentChapterIndex > 0) {
      store.currentChapterIndex -= 1
      nextTick(() => nextTick(() => {
        store.page = store.maxPage
      }))
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
          contents: JSON.stringify(book.contents),
          history: JSON.stringify(book.history)
        })
      })
    }
  }
})

export const currentChapterTitle = computed(() => {
  return store.chapters[store.currentChapterIndex]
})
export const currentBookMarks = computed<WatchHistory[]>(() => store.bookmarks.find(i => i.title === store.currentTxt)?.histories || [])

export const currentChapter = computed(() => {
  const nextIndex = store.currentChapterIndex + 1
  let startIndex = store.txtContent.indexOf(store.chapters[store.currentChapterIndex])
  if (startIndex === -1) {
    startIndex = 0
  }
  const endIndex = store.txtContent.indexOf(store.chapters[nextIndex])
  return store.txtContent.slice(startIndex, endIndex)
})

export const currentBook = computed(() => store.bookshelf.find(i => i.title === store.currentTxt))

watch(() => store.settings, () => {
  localStorage.setItem('settings', JSON.stringify(store.settings))
}, {
  deep: true
})
