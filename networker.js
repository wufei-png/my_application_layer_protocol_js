


//数据包定义：前两个字节表示后面有效payload的长度，之后为payload
function Networker(socket, handler) {
  this.socket = socket;//新建类传入的socket
  this.isprocessing = false;
  this.state = 'HEADER';//初始状态
  this.payloadLength = 0;//有效负载长度
  this.bufferedBytes = 0;//所有信息长度
  this.queue = [];//每次send的数据队列

  this.handler = handler;
}

Networker.prototype.init = function () {
  this.socket.on('data', (data) => {
    //console.log("数据来啦");这里可以看到我创建了三个client发了三次请求，但是打印了四次，这说明这里的socket连接不一定是一个请求发一个包,因此需要while循环判断是否还在处理
    this.bufferedBytes += data.length;
    this.queue.push(data);//不管是否这次来的data是不是上一次一个包的，因为头一定可以确定，头里有长度
    this.isprocessing = true;
    this.processData();
  });

  this.socket.on('served', this.handler);
};

Networker.prototype.hasEnough = function (size) {
  if (this.bufferedBytes >= size) {
    return true;
  }
  this.isprocessing = false;//此时需要的数据长度已经少于进来的queue中的长度，常见于头先进来，但是数据还没有完全传进来，此时需要下面的while语句
  return false;
}

Networker.prototype.readBytes = function (size) {//由于一个数据包的长度不确定，所以需要从queue中取若干数组的长度，实现的功能就是从一个数组中，每个元素不定长，从index低的返回，直到满足长度要求
  let result;
  this.bufferedBytes -= size;

  if (size === this.queue[0].length) {
    return this.queue.shift();//刚好等于第一个元素长度，直接返回
  }

  if (size < this.queue[0].length) {
    result = this.queue[0].slice(0, size);//使用切片，把第一个元素的前size字节的数据返回，剩余的留下
    this.queue[0] = this.queue[0].slice(size);
    return result;
  }
  
  result = Buffer.allocUnsafe(size);
  let offset = 0;
  let length;
  
  while (size > 0) {
    length = this.queue[0].length;

    if (size >= length) {
      this.queue[0].copy(result, offset);//使用buffer的copy函数持续向result中写数据，直到满足size要求（因为之前已经调用enough函数确定了buffer中有大于等于size的数据
      offset += length;
      this.queue.shift();
    } else {
      this.queue[0].copy(result, offset, 0, size);
      this.queue[0] = this.queue[0].slice(size);
    }

    size -= length;
  }

  return result;
}

Networker.prototype.getHeader = function () {
  //console.log("gethead啦");
  if (this.hasEnough(2)) {
    this.payloadLength = this.readBytes(2).readUInt16BE(0);//0为offset
    this.state = 'PAYLOAD';
  }
  //console.log("gethead处理完 啦");
}

Networker.prototype.getPayload = function () {
  //console.log("getPayload 啦");
  if (this.hasEnough(this.payloadLength)) {
    let received = this.readBytes(this.payloadLength);
    this.socket.emit('served', received);//解析后读出数据了
    this.state = 'HEADER';//状态又回去了
  }
  //console.log("getPayload处理完 啦");
}

Networker.prototype.processData = function () {//实际这是一个解码过程
  while (this.isprocessing) {//由于rocket不确定怎么发，需要用while阻塞
    switch (this.state) {
      case 'HEADER':
        this.getHeader();
        break;
      case 'PAYLOAD':
        this.getPayload();
        break;
    }
  }
}

Networker.prototype.send = function (message) {
  let buffer = Buffer.from(message);
  let contentLength = Buffer.allocUnsafe(2);
  contentLength.writeUInt16BE(buffer.length);//长度需要一个buffer实例化
  this.socket.write(contentLength);
  this.socket.write(buffer);//实际这是一个编码过程
}

module.exports = Networker;