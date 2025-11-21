import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Debugging Legislator Names ---')

    // Names that failed in the log
    const targetNames = ['陳秀寳', '莊瑞雄', '柯建銘', '吳思瑤']

    for (const name of targetNames) {
        console.log(`\nSearching for: ${name}`)
        console.log(`Unicode: ${toUnicode(name)}`)

        // Exact match
        const exact = await prisma.legislator.findFirst({
            where: { nameCh: name }
        })
        console.log(`Exact match found: ${!!exact}`)

        // Contains match
        const contains = await prisma.legislator.findFirst({
            where: { nameCh: { contains: name } }
        })
        console.log(`Contains match found: ${!!contains}`)

        // Fuzzy search (find all and check)
        if (!exact) {
            console.log('Attempting fuzzy search in DB...')
            const all = await prisma.legislator.findMany({
                select: { nameCh: true }
            })

            const similar = all.filter(l => {
                // Simple check: do they share at least 2 characters?
                let shared = 0
                for (const char of name) {
                    if (l.nameCh.includes(char)) shared++
                }
                return shared >= 2
            })

            if (similar.length > 0) {
                console.log('Found similar names in DB:')
                similar.forEach(l => {
                    console.log(`- ${l.nameCh} (${toUnicode(l.nameCh)})`)
                })
            } else {
                console.log('No similar names found.')
            }
        }
    }
}

function toUnicode(str: string) {
    return str.split('').map(c => {
        return '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')
    }).join('')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
