const JSEncrypt = require('node-jsencrypt');
const request = require('request');
const async = require('async');
const encrypt = new JSEncrypt();
const cheerio = require('cheerio');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
var fs = require('fs');

var publicKey = "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAN79UcUg0f55hfR2VzpvnYgWVHOgRJd1PEVKE2u9sMsbPWhrndKooXpvL3Fs8JUBRUtn7TLh6Cfr86IM17L7bBsCAwEAAQ==";
encrypt.setPublicKey(publicKey);
var username = encrypt.encrypt("用户名");
var password = encrypt.encrypt("密码")
var verifycode = encrypt.encrypt("")
var myJar = request.jar();
const HOST_URL = 'https://eas.xhd.cn'
const results = [];
const notMatchResult = [];
const matchResult = [];

async.waterfall([
    done => {
        request({
            url: HOST_URL + '/platform/login/vali',
            method: 'POST',
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36"
            },
            form: {
                "username": username,
                "password": password,
                "verifycode": verifycode,
            },
            json: true,
            jar: myJar
        }, (error, resp, data) => {
            if (data.status === 'success') {
                console.log("登录成功")
                done(null)
            } else {
                console.log(data.status);
                console.log(data);
                done("登录失败");
            }
        })
    },
    done => {
        fs.createReadStream('名单.csv')
            .pipe(csv({
                headers: false
            }))
            .on('data', (row) => {
                results.push(row);
            })
            .on('end', () => {
                async.mapSeries(results, (item, done1) => {
                    request({
                        url: HOST_URL + '/sales/clue/allQueries',
                        method: 'POST',
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36"
                        },
                        form: {
                            "_query.customername": "",
                            "_query.mobile": item['1'],
                            "_query.qq": "",
                            "_query.wechat": "",
                            "pageNumber": 1,
                            "pageNumber": 1,
                            "pageSize": "",
                            "orderColunm": "",
                            "orderMode": ""
                        },
                        jar: myJar
                    }, (error, resp, data) => {
                        $ = cheerio.load(data);
                        if ($('#leadsTable tbody tr td').length > 0) {
                            matchResult.push({"phone": item['1']});
                            console.log(`已匹配到手机号${item['1']}`)
                        } else {
                            notMatchResult.push({"phone": item['1']});
                            console.log(`未匹配到手机号${item['1']}`);
                        }
                        done1(null)
                    })
                }, (err) => {
                    done(err);
                })
            })
    }
], (err) => {
    let fileName = `${new Date().valueOf()}.csv`;
    let csvWriter = createCsvWriter({
        path: `./${fileName}`,
        header: [
            { id: 'phone', title: '手机号' },
        ]
    });
    csvWriter
        .writeRecords(notMatchResult)
        .then(() => console.log(`csv文件写入完成,名字为:${fileName}`));
    console.log("执行完成")

})

