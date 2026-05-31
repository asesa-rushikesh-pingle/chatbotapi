var express = require('express');
var router = express.Router();
const cheerio = require("cheerio");

const { QdrantClient } = require("@qdrant/js-client-rest");
const { v4: uuidv4 } = require("uuid");

// const fetch = require("node-fetch");

const { GoogleGenAI } = require("@google/genai");


const ai = new GoogleGenAI({
  apiKey: "AIzaSyA8iHL0pR2qeCrvNQOZZNW4KvbzLMKoSeQ"
});

const WEBHOOK_SECRET = "mySuperSecret123@razorpay";

const QDRANT_URL="https://7991ee7c-16b3-4985-b095-25b95d261dc4.eu-west-1-0.aws.cloud.qdrant.io"
const QDRANT_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6NWU0MDIzNjMtMjk5Yi00NTE3LTg0ZWMtYjhkMTQ1ZjBiMjNmIn0.J86Nx9jPU-zrnij_W4qvFBt9wfqQ5V-tfVbpHtoed30"

const QDRANT_COLLECTION="documents"

const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

// scrap function 

// const pdfParse = require('pdf-parse');
// const pdf = require('pdf-parse');
const { PDFParse } = require('pdf-parse');
const { default: axios } = require('axios');




async function scrapeSitemapText(sitemapUrl) {
  try {

    const sitemapRes = await fetch(sitemapUrl);
    const sitemapXml = await sitemapRes.text();

    // extract URLs from sitemap
    const urlMatches = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)];
    const urls = urlMatches.map(match => match[1]);

    let finalText = "";

    for (const url of urls) {
      try {

        const pageRes = await fetch(url);
        const html = await pageRes.text();

        const $ = cheerio.load(html);

        // remove unwanted tags
        $("script").remove();
        $("style").remove();
        $("noscript").remove();

        const textContent = $("body")
          .text()
          .replace(/\s+/g, " ")
          .trim();

        finalText += textContent + "\n\n";

      } catch (err) {
        console.log("Error scraping:", url);
      }
    }

    return finalText;

  } catch (error) {
    console.error("Sitemap error:", error);
    return "";
  }
}

/* GET home page. */
router.post('/chat', async function (req, res, next) {

  try {

   



    const { question } = req.body
    const { userId } = req.body

    // const type = url.slice(-3).toLowerCase();



    const searchVector =
    await createEmbedding(question);

    const result =
        await qdrant.search(
            QDRANT_COLLECTION,
            {
                vector: searchVector,
                limit: 5,
                filter: {
                  must: [
                    {
                      key: "userId",
                      match: {
                        value: Number(userId)
                      }
                    }
                  ]
                }
            }
        );

    console.log(result);

    let hugeText = result?.map((itm,inxx)=>{
        return itm?.payload?.text
    })?.join(' ')

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      // contents: question
      contents: [
        {
          role: "user",
          parts: [
            {
              text: ` 
          question : ${question}
          read that provided data and answer the above question. 
          note : if you dont find any relevant data or the question is like request to connect to human or person , just response the text "CONNECTING TO HUMAN", if the question is casual respond casual answer.
          data : ${hugeText} `
            }
          ]
        }
      ]

    });

   



    console.log(response.text);

    res.json({
      status: true,
      data: response.text,
      question: question,
      message: 'successfully found message'
    });



  } catch (error) {
    console.log(error)
    res.json({
      status: false,

      message: error
    });
  }

});



// chuking annd embading api 

async function createEmbedding(text) {

  const result = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text
  });

  return result.embeddings[0].values;
}

async function createCollection() {

  await qdrant.createCollection(
        QDRANT_COLLECTION,
      {
          vectors: {
              size: 3072,
              distance: "Cosine"
          }
      }
  );

  console.log("Collection Created");
}

function createChunks(
  text,
  chunkSize = 2000,
  overlap = 200
) {

  const chunks = [];

  let start = 0;

  while (start < text.length) {

      const end = Math.min(
          start + chunkSize,
          text.length
      );

      chunks.push(
          text.slice(start, end)
      );

      start += chunkSize - overlap;
  }

  return chunks;
}

router.post("/save-chunks", async (req, res) => {


  const {
    text,userId
} = req.body;



  try {


    // Validation
     if (!text || !userId ) {
            return res.status(400).json({
                status: false,
                message: "text/userId required"
            });
        }

        // let msg = await createCollection();
        const documentId = uuidv4();

        const chunks = createChunks(
          text,
          2000,
          200
      );

      console.log(
        `Total Chunks : ${chunks.length}`
        );

        const points = [];

        for (let i = 0; i < chunks.length; i++) {

          console.log(
              `Embedding chunk ${i + 1}`
          );

          const vector =
              await createEmbedding(
                  chunks[i]
              );

          points.push({
              id: uuidv4(),
              vector,
              payload: {
                  documentId,
                  userId,
                  chunkIndex: i,
                  text: chunks[i]
              }
          });
        }

        await qdrant.upsert(
          QDRANT_COLLECTION,
          {
              wait: true,
              points
          }
        );

      

    return res.status(201).json({
        status: true,
        message: "chunk saved successfully",
        userId,
        documentId,
        totalChunks: chunks.length
    });
   

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }

});



router.post("/crawl-data", async (req, res) => {
  try {
      const { domain,userId } = req.body;

      if (!domain) {
          return res.status(400).json({
              success: false,
              message: "Domain is required"
          });
      }

      const baseUrl = domain.startsWith("http")
          ? domain
          : `https://${domain}`;

      const response = await axios.get(baseUrl, {
          timeout: 10000
      });

      const $ = cheerio.load(response.data);

      const links = new Set();

      $("a").each((_, element) => {
          let href = $(element).attr("href");

          if (!href) return;

          try {
              if (href.startsWith("/")) {
                  href = new URL(href, baseUrl).href;
              }

              if (
                  href.startsWith(baseUrl) ||
                  href.includes(new URL(baseUrl).hostname)
              ) {
                  links.add(href.split("#")[0]);
              }
          } catch (err) {}
      });


      let finalText = "";

      for (const url of links) {
        try {
  
          const pageRes = await fetch(url);
          const html = await pageRes.text();
  
          const $ = cheerio.load(html);
  
          // remove unwanted tags
          $("script").remove();
          $("style").remove();
          $("noscript").remove();
  
          const textContent = $("body")
            .text()
            .replace(/\s+/g, " ")
            .trim();
  
          finalText += textContent + "\n\n";
          console.log("this url is done ",url)
  
        } catch (err) {
          console.log("Error scraping:", url);
        }
      }
  
      // return finalText;

      // hokjsdbckjsdbkh
    //   const {
    //     text,userId
    // } = req.body;
    
    
    
      try {
    
    
        // Validation
         if (!finalText || !userId ) {
                return res.status(400).json({
                    status: false,
                    message: "text/userId required"
                });
            }
    
            // let msg = await createCollection();
            const documentId = uuidv4();
    
            const chunks = createChunks(
              finalText,
              2000,
              200
          );
    
          console.log(
            `Total Chunks : ${chunks.length}`
            );
    
            const points = [];
    
            for (let i = 0; i < chunks.length; i++) {
    
              console.log(
                  `Embedding chunk ${i + 1}`
              );
    
              const vector =
                  await createEmbedding(
                      chunks[i]
                  );
    
              points.push({
                  id: uuidv4(),
                  vector,
                  payload: {
                      documentId,
                      userId,
                      chunkIndex: i,
                      text: chunks[i]
                  }
              });
            }
    
            await qdrant.upsert(
              QDRANT_COLLECTION,
              {
                  wait: true,
                  points
              }
            );
    
          
    
        return res.status(201).json({
            status: true,
            message: "chunk saved successfully",
            links: [...links],
            userId,
            documentId,
            totalChunks: chunks.length,
            finalText
        });
       
    
      } catch (err) {
        console.log(err);
        return res.status(500).json({
          status: false,
          message: err.message
        });
      }
      // kdjbvkjdsbvk

      // return res.json({
      //     success: true,
      //     totalLinks: links.size,
      //     links: [...links],
      //     finalText
      // });

  } catch (error) {
      return res.status(500).json({
          success: false,
          message: error.message
      });
  }
});


module.exports = router;
