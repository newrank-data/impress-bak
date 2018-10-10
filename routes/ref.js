const express = require('express');
const router = express.Router();
const fs = require('fs');
const generateRef = require('../scripts/generate_ref.js');

router.get('/', (req, res) => {
  fs.readFile('public/files/ref.json', (err, ref) => {
    if (!err) {
      // 本地存在时直接返回
      res.status(200).type('application/json').send(ref);

    } else {
      // 本地不存在则立刻生成
      generateRef(reply => {
        if (reply.status == 1) {
          const ref = reply.ref;
          res.status(200).type('application/json').send(JSON.stringify(ref));
          
        } else {
          res.status(500).type('application/json').send({msg: '生成 ref 失败'});
        }
      });
    }
  });
});

module.exports = router;