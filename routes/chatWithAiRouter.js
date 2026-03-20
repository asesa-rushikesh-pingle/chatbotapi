var express = require('express');
var router = express.Router();
const cheerio = require("cheerio");

// const fetch = require("node-fetch");

const { GoogleGenAI } = require("@google/genai");


const ai = new GoogleGenAI({
  apiKey: "AIzaSyA72I8eDr8vjZ3VV8oqK8dSAoGKsg-sd_Q"
});

// scrap function 




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
    const { url } = req.body

    const type = url.slice(-3).toLowerCase();


    if (type == 'pdf') {
     
      console.log('finding pdf data')
      const pdfUrl = url;
      // // const pdfUrl = "https://unec.edu.az/application/uploads/2014/12/pdf-sample.pdf";

      const pdfResponse = await fetch(pdfUrl);
      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        // contents: question
        contents: [
          {
            role: "user",
            parts: [
               {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfBuffer.toString("base64")
              }
            },
              {
                text: ` 
            question : ${question}
            read that provided data and answer the above question. 
            note : if you dont find any relevant data or the question is like request to connect to human or person , just response the text "CONNECTING TO HUMAN", if the question is casual respond casual answer.
             `
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


    } else {
      console.log('finding sitemap data')
      const sitemapData = await scrapeSitemapText(url);

      console.log(sitemapData);


      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
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
            data : ${sitemapData} `
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

    }




  } catch (error) {
    console.log(error)
    res.json({
      status: false,

      message: error
    });
  }

});

module.exports = router;
