
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // TPP members in 11th term
    const tppMembers = ['黃國昌', '黃珊珊', '林國成', '吳春城', '麥玉珍', '陳昭姿', '江琦', '張啓楷']

    console.log('Checking interpellations for TPP members...')

    for (const name of tppMembers) {
        const encodedName = encodeURIComponent(name)
        const url = `https://ly.govapi.tw/v2/interpellations?屆=11&質詢委員=${encodedName}&limit=1`

        try {
            const res = await fetch(url)
            const data = await res.json()
            console.log(`${name}: ${data.total} interpellations`)
        } catch (e) {
            console.error(`${name}: Error fetching - ${(e as any).message}`)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
