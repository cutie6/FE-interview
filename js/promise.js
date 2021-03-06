// 手写 promise
// 参考珠峰公开课 https://www.bilibili.com/video/av83168380/?p=3&t=2835

// 用法
// (1) 同步
// let promise = new Promise((resolve, reject) => {
//     reject("reject");
//     resolve("resolve"); // resolve 不会执行
// }).then(
//     data => {
//         console.log(data);
//     },
//     err => {
//         console.log("err: ", err);
//     }
// );

// (2) 异步
// let promise = new Promise((resolve, reject) => {
//     setTimeout(() => {
//         resolve("成功");
//     }, 1000);
// });
// promise.then(
//     data => {
//         console.log(1, data);
//     },
//     err => {
//         console.log(1, "err: ", err);
//     }
// );
// promise.then(
//     data => {
//         console.log(2, data);
//     },
//     err => {
//         console.log(2, "err: ", err);
//     }
// );

// (3) then 的处理
// 1. 判断成功和失败函数的返回结果
// 2. 判读是不是 promise，如果是 promise ，就采用它的状态
// 3. 如果不是 promise，直接将结果传递下去

// let p = new Promise((resolve, reject) => {
//     resolve(100);
// });

// let promise2 = p.then(data => {
//     // return 1000;
//     throw new Error("失败");
// });
// promise2
//     .then(
//         data => {
//             console.log(data);
//         },
//         err => {
//             console.log(err);
//         }
//     )
//     .then(data => {
//         console.log(data);
//     });

// 实现
const PENDING = "PENDING";
const RESOLVED = "RESOLVED";
const REJECTED = "REJECTED";

const isThenable = value => {
    if (
        (typeof value === "object" && value != null) ||
        typeof value === "function"
    ) {
        if (typeof value.then === "function") {
            return true;
        }
    }
    return false;
};

// const getFinalValue = obj => {
//     if (!isThenable(obj)) return obj;

//     obj.then(res => {
//         return getFinalValue(res);
//     });
// };

// console.log(getFinalValue(444))
// let p1=new Promise((resolve,reject)=>{
//     resolve(555)
// })
// console.log('return value:'+getFinalValue(p1))// 这里是因为韩式是异步函数吧

// 直接调用下面的 resolvePromise 就行，不用再写一个函数
// const resolveFinalValue = (obj, resolve) => {
//     if (!isThenable(obj)) {
//         resolve(obj);
//     } else {
//         obj.then(res => {
//             resolveFinalValue(res, resolve);
//         });
//     }
// };

const resolvePromise = (promise2, x, resolve, reject) => {
    if (promise2 === x) {
        return reject(new TypeError("chaning cycle detected for promise"));
    }
    if ((typeof x === "object" && x !== null) || typeof x === "function") {
        let called;

        try {
            let then = x.then;
            if (typeof then === "function") {
                //保证不用再次取 then 的值
                then.call(
                    x,
                    y => {
                        if (called) return;
                        called = true;
                        // y 可能还是一个 promise
                        // 递归调用，直到是普通值为止
                        resolvePromise(promise2, y, resolve, reject);
                    },
                    r => {
                        if (called) return;
                        called = true;
                        reject(r);
                    }
                );
            } else {
                // 这里不用标记 called?
                resolve(x);
            }
        } catch (e) {
            if (called) return;
            called = true;
            reject(e);
        }
    } else {
        // 这里不用标记 called?
        resolve(x);
    }
};

class MyPromise {
    constructor(executor) {
        this.status = PENDING;
        this.value = undefined;
        this.reason = undefined;

        this.onResolvedCallbacks = [];
        this.onRejectedCallbacks = [];

        // 箭头函数可以保证 this 指向 Mypromise 实例
        let resolve = value => {
            // 避免调用了 reject 后又调用 resolve
            if (this.status === PENDING) {
                this.value = value;
                this.status = RESOLVED;
                this.onResolvedCallbacks.forEach(fn => fn());
            }
        };
        let reject = reason => {
            if (this.status === PENDING) {
                this.reason = reason;
                this.status = REJECTED;
                this.onRejectedCallbacks.forEach(fn => fn());
            }
        };
        try {
            // try catch 只能捕获同步异常
            // executor 内部错误的话也要走 reject 流程
            executor(resolve, reject);
        } catch (error) {
            reject(error);
        }
    }
    then(onFulfilled, onRejected) {
        // (4) then的参数可选
        // let p = new Promise((resolve, reject) => {
        //     resolve(123);
        // });
        // p.then()
        //     .then()
        //     .then(data => {
        //         console.log(data);
        //     });

        onFulfilled =
            typeof onFulfilled === "function" ? onFulfilled : data => data;
        onRejected =
            typeof onRejected === "function"
                ? onRejected
                : err => {
                      throw err;
                  };
        let promise2 = new MyPromise((resolve, reject) => {
            // 如果 excutor 里是同步函数
            if (this.status === RESOLVED) {
                // x 可能是普通值，也可能是 thenable 类型

                // 这时候 promise2 is not defined，
                // 得 new MyPromise 执行完成 promise2 才能存在
                // resolvePromise(promise2,x,resolve,reject)

                setTimeout(() => {
                    // setTimeout 里可以获取到 promise2
                    // 但是  try catch 只能捕获同步异常
                    // 所以 setTimout 里还要用 try catch 包一层
                    try {
                        let x = onFulfilled(this.value);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                }, 0);
            }
            if (this.status === REJECTED) {
                setTimeout(() => {
                    try {
                        let x = onRejected(this.reason);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                }, 0);
            }
            // 如果 excutor 里是异步函数，没有立刻调用 resolve 或者 reject
            // 就先订阅
            if (this.status === PENDING) {
                this.onResolvedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onFulfilled(this.value);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }
                    }, 0);
                });
                this.onRejectedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }
                    }, 0);
                });
            }
        });
        return promise2;
    }
}

// (5) Promise.defer 解决封装嵌套的问题
// let fs =require('fs')
// function read(url){
//     let dfd=Promise.defer()
//     fs.readFile(url,'utf8',function(err,data){
//         if(err) dfd.reject(err)
//         dfd.resolve(data)
//     })
//     return dfd.promise;
// }
// read('./name.txt').then(data=>{
//     console.log(data)
// })
MyPromise.defer = MyPromise.deferred = function() {
    let dfd = {};
    dfd.myPromise = new MyPromise((resolve, reject) => {
        dfd.resolve = resolve;
        dfd.reject = reject;
    });
};

//（7）Promise.resolve
MyPromise.resolve = function(value) {
    let promise2 = new MyPromise((resolve, reject) => {
        try {
            // setTimeout(() => {
            //     // setTimeout 里才能获取到 promise2
            //     resolvePromise(promise2, value, resolve, reject);
            // }, 0);

            // 这里 value 和 promise2 不可能相同，就不浪费一个 setTimeout 的时间了
            // 直接传一个空对象了
            // 少了 0.004 秒
            resolvePromise({}, value, resolve, reject);

        } catch (err) {
            reject(err);
        }
    });
    return promise2;
};

// let p=new MyPromise((resolve,reject)=>{
//     reject(333)
// })
// const promise1 = MyPromise.resolve(p);

// promise1.then(function(value) {
//     console.log('value:'+value);
// },err=>{
//     console.log('err: '+err)
// });

// (8) 实例方法 catch
//记得之前看的，catch 就是 then(null,errCb)
// then 方法里自动将缺省参数补齐了
MyPromise.prototype.catch = function(cb) {
    return this.then(null, cb);
};

// let p = new MyPromise((resolve, reject) => {
//     reject(1000);
// });
// p.then(data => {
//     console.log(data);
// })
//     .catch(e => {
//         console.log("err: " + e);
//     })
//     .then(data => {
//         console.log(data);
//     });

// (9) 实例方法 finally
MyPromise.prototype.finally = function(cb) {
    try {
        let value = cb();

        return this.then(
            data => {
                // Promise.resolve() 可以等待 promise 执行完成
                return MyPromise.resolve(value).then(
                    () => data,
                    err => {
                        throw err;
                    }
                );
            },
            err => {
                return MyPromise.resolve(value).then(
                    () => {
                        throw err;
                    },
                    err => {
                        throw err;
                    }
                );
            }
        );
    } catch (err) {
        console.log("err333: " + e);
    }
};

// let p = new MyPromise((resolve, reject) => {
//     // reject(1000);
//     resolve(1000);
// });
// p.finally(() => {
//     console.log("最终的");
//     return new MyPromise((resolve, reject) => {
//         console.log("finally 中的 promise");

//         reject(11111);
//         // resolve(11111);
//     });
// })
//     .then(data => {
//         console.log("then: " + data);
//     })
//     .catch(e => {
//         console.log("err: " + e);
//     });

//（10）静态方法 Promise.race

MyPromise.race = function(values) {
    return new MyPromise((resolve, reject) => {
        for (let i = 0; i < values.length; i++) {
            const current = values[i];

            MyPromise.resolve(current).then(data => {
                resolve(data);
            }, reject);
        }
    });
};

const promise1 = new MyPromise(function(resolve, reject) {
    setTimeout(resolve, 500, "one");
});

const promise2 = new MyPromise(function(resolve, reject) {
    setTimeout(resolve, 200, "two");
});

// MyPromise.race([promise1, promise2]).then(function(value) {
//     console.log(value);
// },err=>{
//     console.log('err: '+err)
// });

// (6) Promise.all
// 静态方法
// Promise.all([1,2,3,read('./name.txt'),6,7]).then(data=>{
//     console.log(data)
// })

// 注意：
// 结果也要是有序的
// 任何一个出错就 reject
MyPromise.all = function(values) {
    return new MyPromise((resolve, reject) => {
        let arr = [];

        // 使用计数器解决多个异步的并发问题
        let index = 0;
        function processData(key, value) {
            arr[key] = value;
            index++;

            // 不能直接判断 arr.length 与 values.length 是否相等
            // 因为可能会给 arr 后面的项目先赋值，这样前面异步的项目会变为 <empty>，
            // 这时有异步结果没有返回，但是 arr.length 可能就已经和 values.length 相同了
            if (index === values.length) {
                resolve(arr);
            }
        }

        for (let i = 0; i < values.length; i++) {
            const current = values[i];
   
            MyPromise.resolve(current).then(data => {
                processData(i, data);
            }, reject);
        }
    });
};

MyPromise.all([promise1, promise2]).then(
    function(value) {
        console.log(value);
    },
    err => {
        console.log("err: " + err);
    }
);

module.exports = MyPromise; // nodeJS 写法
// export default MyPromise; // es6 module 写法
