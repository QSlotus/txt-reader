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

export const dbPromise = openDB<MyDataBase>('bookshelf', 2, {
  upgrade(db) {
    if (db.objectStoreNames.contains('bookshelf')) {
      db.deleteObjectStore('bookshelf')
    }
    db.createObjectStore('bookshelf', { keyPath: 'title' })
  },
  blocking(currentVersion: number, blockedVersion: number | null, event: IDBVersionChangeEvent) {
    console.log('blocking')
  },
  blocked() {
    console.log('blocked')
  }
})
