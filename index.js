const fs = require('fs');
const parseArgs = require('minimist-lite')
const {transform, parse, stringify} = require('csv');

const args = parseArgs(process.argv.slice(2));
const inputFilePath = args.i || args.input
const outputFilePath = args.o || args.output || './output-for-clockodo.csv'

if (!fs.existsSync(inputFilePath)) {
    console.error(`ERROR: Input file ('${inputFilePath}') does not exist!`)
    process.exit(1)
}

// const columnsClockifyEn = ["Project", "Client", "Description", "Task", "Kiosk", "User", "Group", "Email", "Tags", "Billable", "Start Date", "Start Time", "End Date", "End Time", "Duration (h)", "Duration (decimal)", "Billable Rate (CHF)", "Billable Amount (CHF)"]
// const columnsClockifyDe = ['Projekt', 'Kunde', 'Beschreibung', 'Aufgabe', 'Kiosk', 'Benutzer', 'Gruppe', 'Email', 'Tags', 'Abrechenbar', 'Startdatum', 'Startzeit', 'Enddatum', 'Endzeit', 'Dauer (h)', 'Dauer (dezimal)', 'Abrechenbarer Tarif (CHF)', 'Rechnungsbetrag (CHF)']
const columns = ['rate', 'startDateTime', 'endDateTime', 'billable', 'employee', 'project', 'customer', 'service']

const writableStream = fs.createWriteStream(outputFilePath);
writableStream.write('\n') // needed, so the file isn't recognized as MIME type text/csv, as this is not allowed on clocko:do

const now = new Date()
now.setHours(0, 0, 0, 0)

fs.createReadStream(inputFilePath)
    .pipe(parse({delimiter: ',', fromLine: 2}))
    .on('end', function () {
        console.log('Finished');
    })
    .on('error', function (error) {
        console.log(`ERROR: ${error.message}`);
        process.exit(1);
    })
    .pipe(transform((entry => {
        const keys = Object.keys(entry)
        const duration = new Date(`${now.toDateString()} ${entry[keys[14]]}`) - now
        if (duration > 0) {
            const startDate = new Date(`${entry[keys[10]]} ${entry[keys[11]]} GMT+02:00`).toISOString().replace('.000Z', 'Z');
            const endDate = new Date(`${entry[keys[12]]} ${entry[keys[13]]} GMT+02:00`).toISOString().replace('.000Z', 'Z');

            return {
                rate: entry[keys[16]],
                startDateTime: startDate,
                endDateTime: endDate,
                billable: ['ja', 'yes', '1', 'true', true, 1].some(value => value === entry[keys[9]].toLowerCase()) ? 1 : 0,
                employee: entry[keys[5]],
                project: entry[keys[0]],
                customer: entry[keys[1]],
                service: 'Umsetzung / Entwicklung',
            };
        }
    })))
    .pipe(stringify({header: true, columns: columns}))
    .pipe(writableStream)
