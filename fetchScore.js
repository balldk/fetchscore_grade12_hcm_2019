const axios = require('axios')
const fs = require('fs')
const throat = require('throat')(40)
const _cliProgress = require('cli-progress');

const bar = new _cliProgress.Bar({
    format: 'Fetching [{bar}] {percentage}% | ETA: {eta} | {value}/{total} | Error: {error}'
}, _cliProgress.Presets.rect)

const regSubject = /<td class="red">([^\/]*)<\/td>/gm
const regScore = /<td class="color-red">([\d.]*)<\/td>/gm
const regName = /<span id="ctl01_tenthisinh" class="diem">(.*)<\/span><\/p>/gm
const headers = ['SBD', 'Tên', 'Toán', 'Văn', 'Ngoại Ngữ', 'Lí', 'Hoá', 'Sinh', 'Sử', 'Địa', 'GDCD']
const min = 2000001
const max = 2071045
let len = max - min + 1
let current = 0
let errors = []
let filename = 'grade12'

const fetchScore = id => {
    let promise = resolve =>
    axios.get(`https://diemthi.tuoitre.vn/kythi2019.html?FiledValue=0${id}&MaTruong=l12hcm`)
    .then(res => {
        const data = res.data
        const subjects = []
        const scores = []
        let name = ''
        let result = Array(9).fill(0)
        data.replace(regSubject, (match, group) => subjects.push(group))
        data.replace(regScore, (match, group) => scores.push(parseFloat(group)))
        data.replace(regName, (match, group) => name = group)
        subjects.forEach((each, i) => {
            if (each === 'Toán') result[0] = scores[i]
            else if (each === 'Ngữ văn') result[1] = scores[i]
            else if (each.startsWith('Tiếng')) result[2] = scores[i]
            else if (each === 'Vật lí') result[3] = scores[i]
            else if (each === 'Hóa học') result[4] = scores[i]
            else if (each === 'Sinh học') result[5] = scores[i]
            else if (each === 'Lịch sử') result[6] = scores[i]
            else if (each === 'Địa lí') result[7] = scores[i]
            else if (each === 'GDCD') result[8] = scores[i]
        })
        bar.update(++current)
        resolve([`'0${id}`, name, ...result])
    })
    .catch(() => {
        bar.setTotal(--len)
        errors.push(id)
        bar.update(current, {
            error: errors.length
        })
        resolve([])
    })
    return throat(() => new Promise(promise))
}

let promises = Array(len).fill(0).map((each, index) => fetchScore(min+index))

let splitPromises = []
let size = 2000
for (let i = 0; i < promises.length; i += size) {
    splitPromises.push(promises.slice(i, i+size))
}

console.log('\033[2J')
bar.start(len, 0, {
    error: 0
})
fs.writeFileSync(`${filename}.csv`, headers.join(';') + '\n')
Promise.all(splitPromises.map(async each => {
    await Promise.all(each).then(val => {
        fs.appendFileSync(`${filename}.csv`, val.map(each => each.join(';')).join('\n')+'\n')
    })
})).then(() => {
    fs.writeFileSync(`${filename}_errors.csv`, errors.join('\n'))
    bar.stop()
})