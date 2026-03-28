const app = require('../server/index')

module.exports = app
module.exports.config = {
  api: {
    bodyParser: false,
    sizeLimit: '10mb',
  },
}
