import { Client } from '@notionhq/client'
import { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints'
import ogp from 'ogp-parser'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TODO = any

export const addFeedItems = async (
  newFeedItems: {
    [key: string]: TODO
  }[]
) => {
  const notion = new Client({ auth: process.env.NOTION_KEY })
  const databaseId = process.env.NOTION_READER_DATABASE_ID || ''

//追加
  const getFormattedTitle = (title: string, link?: string): string => {
    if (link && link.includes('ncode.syosetu.com')) {
      const matches = title.match(/-(.*?)]/)
      if (matches && matches[1]) {
        return matches[1].trim()
      }
    } else if (link && link.includes('tobooks.shop-pro.jp')) {
      return title.replace('穏やか貴族の休暇のすすめ。', '').trim()
    }
    return title.trim()
  }
//ここまで
  
  newFeedItems.forEach(async (item) => {
    const { title, link, enclosure, pubDate } = item
    const domain = link?.match(/^https?:\/{2,}(.*?)(?:\/|\?|#|$)/)

    const properties: TODO = {
     Title: {
        title: [
          {
            text: {
 //↓へ変更             content: title,
                 content: getFormattedTitle(title, link),
           },
          },
        ],
      }, 
    
      URL: {
        url: link,
      },
      Domain: {
        select: {
          name: domain ? domain[1] : null,
        },
      },
      'Created At': {
        rich_text: [
          {
            text: {
              content: pubDate,
            },
          },
        ],
      },
    }

    const ogpImage = link
      ? await ogp(link).then((data) => {
          const imageList = data.ogp['og:image']
          return imageList ? imageList[0] : null
        })
      : ''

    const children: CreatePageParameters['children'] = enclosure
      ? [
          {
            type: 'image',
            image: {
              type: 'external',
              external: {
                url: enclosure?.url,
              },
            },
          },
        ]
      : ogpImage
      ? [
          {
            type: 'image',
            image: {
              type: 'external',
              external: {
                url: ogpImage,
              },
            },
          },
        ]
      : []
  
    try {
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
        children,
      })
    } catch (error) {
      console.error(error)
    }
  })
}
