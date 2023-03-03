import type { DBSchema } from 'idb'
import { openDB } from 'idb'

// bookshelf has title, chapters, contents, watch-history
interface MyDataBase extends DBSchema {
  'bookshelf': {
    key: string,
    indexes: {},
    value: {
      title: string,
      chapters: string,
      contents: string,
      history: string
    }
  },
  // bookmarks has title, watch-history
  bookmarks: {
    key: string,
    indexes: {},
    value: {
      title: string,
      history: string
    }
  }
}

export const dbPromise = openDB<MyDataBase>('bookshelf', 1, {
  upgrade(db) {
    db.createObjectStore('bookshelf', { keyPath: 'title' })
    db.createObjectStore('bookmarks', { keyPath: 'title' })
  }
})

export async function getBookshelfStore() {
  const db = await dbPromise
  return db.transaction('bookshelf').objectStore('bookshelf')
}

export async function getBookmarkStore() {
  const db = await dbPromise
  return db.transaction('bookmarks').objectStore('bookmarks')
}
