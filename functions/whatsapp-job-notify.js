const post = require("request").post;
const cheerio = require("cheerio");

const { accountSid, authToken, whatsappNumber } = process.env;
const client = require("twilio")(accountSid, authToken);

exports.handler = async function (event, context, callback) {
  try {
    const jobs = await getLatestJobs();

    if (jobs.length > 0) {
      await sendMessage(createMessage(jobs));
    }
    return {
      statusCode: 200,
      body: "Success",
    };
    // callback(null, );
  } catch (error) {
    callback(null, {
      statusCode: 500,
      body: error.message,
    });
  }
};

const createMessage = (jobs) => {
  let jobsMessage = "";

  jobs.forEach((job) => {
    jobsMessage += `
    *Title* : ${job.job_title}
    *Type*  : ${job.job_type}
    *Link*  : ${job.job_link}

        `;
  });
  const message = `
    Hey there,

    Its job update on Startup Goa for ${new Date().toDateString()}

    ${jobsMessage}

    Have a great day !

    `;

  return message;
};

const getLatestJobs = async () => {
  const html = await fetchJobsFromStartUp();
  const jobs = await parseData(html);
  const jobsPostedToday = jobs.filter(
    (job) => job.posted_date && job.posted_date.includes("hour")
  );
  return jobsPostedToday;
};

const fetchJobsFromStartUp = async () => {
  const FORMDATA = {
    per_page: "10",
    orderby: "latest",
    order: "DESC",
    page: "1",
    show_pagination: "false",
  };
  const HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "*/*",
    DNT: "1",
    Referer: "http://startupgoa.org/jobs/",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "http://startupgoa.org",
    "X-Requested-With": "XMLHttpRequest",
  };
  return new Promise((resolve, reject) => {
    post(
      {
        uri: "http://startupgoa.org/jm-ajax/get_listings/",
        headers: HEADERS,
        form: FORMDATA,
      },
      (err, httpResponse, body) => {
        if (err) {
          reject(err);
        } else {
          body = JSON.parse(body);
          resolve(body.html);
        }
      }
    );
  });
};

function parseData(html) {
  const $ = cheerio.load(html, {
    normalizeWhitespace: true,
  });

  const nodes = $('li[id^="job_listing"]');
  let op = [];
  for (let i = 0; i < nodes.length; i++) {
    const element = nodes[i];
    let job = {
      job_id: $(element).attr("id").replace("job_listing-", ""),
      job_title: $(element).attr("data-title"),
      job_type: $(element).find("ul.meta>li.job-type").text().trim(),
      job_link: $(element).attr("data-href"),
      posted_date: $(element)
        .find("ul.meta>li.date")
        .text()
        .replace(/Posted|ago/gi, "")
        .trim(),
    };
    op.push(job);
  }
  return op;
}

async function sendMessage(message) {
  try {
    const resp = await client.messages.create({
      from: "whatsapp:+14155238886",
      body: message,
      to: whatsappNumber,
    });
    return resp;
  } catch (error) {
    return Promise.reject(error);
  }
}
//  sendMessage('')
// getLatestJobs();
