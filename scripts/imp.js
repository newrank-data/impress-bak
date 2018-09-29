postMessage('😈小恶魔启动');

const request = indexedDB.open('newrank');

request.onerror = function (e) {
  postMessage({
    text: '连接数据库失败',
    flag: true
  });
}

request.onsuccess = function (e) {
  const db = this.result;
  const transaction = db.transaction('impress');
  const objectStore = transaction.objectStore('impress');
  const request = objectStore.get('2984080171997443');

  request.error = function (e) {
    console.log(e);
    db.close();
  }
  
  request.onsuccess = function (e) {
    console.log(e.target.result);
    db.close();
  }
  
}