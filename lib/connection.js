const r = require("rethinkdb")
const Table = require("./table")

module.exports = class Connection {
  static connect(options, tables, cb) {
    r.connect(options, (err, conn) => {
      if (err) return cb(err)
      cb(null, new Connection(options, conn, tables))
    })
  }

  constructor(options, conn, tables) {
    this.options = Object.assign({indexes: []}, options)
    this.conn = conn
    this.db = r.db(conn.db)
    this.tables = {}
    this._setupTables(tables)
    //sails.r = this.db
    //sails.conn = conn
  }

  close(cb) {
    this.conn.close(cb)
  }

  createTable(name, cb) {
    this.db.tableCreate(name).run(this.conn, cb)
  }

  dropTable(name, cb) {
    this.db.tableDrop(name).run(this.conn, cb)
  }

  _setupTables(tables) {
    var {conn: {db}, conn, options: {indexes}} = this
    tables = Object.keys(tables)
    r.dbCreate(db).run(conn, (err, result) => {
      if (err && !err.message.match(/Database `.*` already exists/))
        throw err
      return Promise.all(tables.map(t => {
        r.tableCreate(t).run(conn).catch(err => {
          if (!err.message.match(/Table `.*` already exists/))
            throw err
          return true
        })
      })).then(() => {
        return Promise.all(indexes.map(i => Promise.all(i[1].map(v => {
          return r.table(i[0]).indexCreate(v).run(conn).catch(err => {
            if (!err.message.match(/Index `.*` already exists/))
              throw err
            return true
          })}))))
      }).catch(err => {
        throw err
      })
    })

    tables.forEach(name => {
      this.tables[name] = new Table(this.conn, name)
    })
  }
}
