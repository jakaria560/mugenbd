// =====================================================
// MugenBD Link System
// Cloudflare Worker + D1
// =====================================================

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // =====================================================
    // CORS
    // =====================================================

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // =====================================================
    // TEST DATABASE
    // =====================================================

    if (
      url.pathname === "/test" &&
      request.method === "GET"
    ) {

      try {

        const result = await env.DB
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='links'"
          )
          .first();

        return new Response(
          JSON.stringify({
            success: true,
            database: "connected",
            links_table: !!result
          }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );

      } catch (error) {

        return new Response(
          JSON.stringify({
            success: false,
            error: error.message
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );
      }
    }

    // =====================================================
    // GENERATE SHORT LINK
    // =====================================================

    if (
      url.pathname === "/generate" &&
      request.method === "POST"
    ) {

      try {

        const body = await request.json();

        const finalUrl = body.final_url;

        if (!finalUrl) {

          return new Response(
            JSON.stringify({
              success: false,
              error: "Final URL is required"
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders
              }
            }
          );
        }

        // Validate URL

        try {

          const parsedUrl = new URL(finalUrl);

          if (
            parsedUrl.protocol !== "http:" &&
            parsedUrl.protocol !== "https:"
          ) {
            throw new Error("Invalid URL");
          }

        } catch {

          return new Response(
            JSON.stringify({
              success: false,
              error:
                "Please provide a valid HTTP or HTTPS URL."
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders
              }
            }
          );
        }

        // Generate short code

        const shortCode = crypto
          .randomUUID()
          .replaceAll("-", "")
          .slice(0, 7);

        // Save to D1

        await env.DB
          .prepare(
            "INSERT INTO links (short_code, final_url, created_at) VALUES (?, ?, ?)"
          )
          .bind(
            shortCode,
            finalUrl,
            new Date().toISOString()
          )
          .run();

        return new Response(
          JSON.stringify({
            success: true,
            short_code: shortCode
          }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );

      } catch (error) {

        return new Response(
          JSON.stringify({
            success: false,
            error: error.message
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );
      }
    }

    // =====================================================
    // SHORT LINK /go/:code
    // =====================================================

    if (
      url.pathname.startsWith("/go/") &&
      request.method === "GET"
    ) {

      const shortCode = url.pathname
        .replace("/go/", "")
        .trim();

      if (!shortCode) {

        return new Response(
          "Invalid short link.",
          {
            status: 400
          }
        );
      }

      try {

        const result = await env.DB
          .prepare(
            "SELECT final_url FROM links WHERE short_code = ? LIMIT 1"
          )
          .bind(shortCode)
          .first();

        // =================================================
        // LINK NOT FOUND
        // =================================================

        if (
          !result ||
          !result.final_url
        ) {

          return new Response(
`
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>Link Not Found - MugenBD</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:Arial,Helvetica,sans-serif;
  background:#f4f6fb;
  color:#222;
  padding:50px 15px;
}

.box{
  max-width:500px;
  margin:auto;
  background:#fff;
  padding:35px 20px;
  border-radius:15px;
  text-align:center;
  box-shadow:0 5px 25px rgba(0,0,0,.08);
}

h2{
  margin-top:0;
}

</style>

</head>

<body>

<div class="box">

<h2>
404 - Link Not Found
</h2>

<p>
This MugenBD link does not exist or has expired.
</p>

</div>

</body>

</html>
`,
            {
              status:404,
              headers:{
                "Content-Type":
                  "text/html;charset=UTF-8"
              }
            }
          );
        }

        // =================================================
        // FINAL URL
        // =================================================

        const finalUrl = result.final_url;

        // =================================================
        // ARTICLE / UNLOCK PAGE
        // =================================================

        const html = `

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>
Top 10 Best Anime You Should Watch - MugenBD
</title>

<style>

/* =====================================================
   GLOBAL
===================================================== */

*{
  box-sizing:border-box;
  margin:0;
  padding:0;
}

html{
  scroll-behavior:smooth;
}

body{
  font-family:Arial,Helvetica,sans-serif;
  background:#f4f6fb;
  color:#222;
  line-height:1.7;
}

.container{
  width:100%;
  max-width:850px;
  margin:auto;
  padding:15px;
}

/* =====================================================
   HEADER
===================================================== */

.header{
  background:#4052b8;
  color:#fff;
  padding:22px 15px;
  text-align:center;
}

.logo{
  font-size:29px;
  font-weight:700;
}

/* =====================================================
   ARTICLE CARD
===================================================== */

.article-card{
  background:#fff;
  margin-top:18px;
  border-radius:12px;
  overflow:hidden;
  box-shadow:
    0 3px 18px rgba(0,0,0,.08);
}

.article-content{
  padding:20px;
}

.article-title{
  font-size:28px;
  line-height:1.3;
  margin-bottom:10px;
  color:#222;
}

.meta{
  color:#777;
  font-size:14px;
  margin-bottom:18px;
}

/* =====================================================
   ADS
===================================================== */

.ad-box{
  width:100%;
  display:flex;
  justify-content:center;
  align-items:center;
  margin:20px auto;
  overflow:hidden;
}

.ad-300{
  width:300px;
  max-width:100%;
  min-height:250px;
  overflow:hidden;
}

.ad-728{
  width:100%;
  max-width:728px;
  min-height:90px;
  overflow:hidden;
}

.ad-728-inner{
  width:100%;
  max-width:728px;
  overflow:hidden;
}

/* =====================================================
   UNLOCK BOX
===================================================== */

.unlock-box{
  background:#f8f9ff;
  border:1px solid #e1e5ff;
  border-radius:12px;
  padding:20px;
  text-align:center;
  margin:20px 0;
}

.unlock-title{
  font-size:21px;
  font-weight:700;
  margin-bottom:6px;
}

.unlock-text{
  color:#666;
  font-size:14px;
  margin-bottom:15px;
}

.get-btn{
  border:none;
  background:#4052b8;
  color:#fff;
  font-size:18px;
  font-weight:700;
  padding:13px 28px;
  border-radius:7px;
  cursor:pointer;
  min-width:180px;
  transition:.2s;
}

.get-btn:hover{
  background:#33439d;
}

.get-btn:disabled{
  opacity:.65;
  cursor:not-allowed;
}

.countdown{
  margin-top:10px;
  color:#555;
  font-size:14px;
  display:none;
}

/* =====================================================
   ARTICLE
===================================================== */

.article-text{
  scroll-margin-top:20px;
}

.article-text h2{
  color:#4052b8;
  margin:25px 0 8px;
  font-size:23px;
}

.article-text p{
  margin-bottom:12px;
  color:#444;
}

.article-text ol{
  padding-left:22px;
}

.article-text li{
  margin-bottom:15px;
}

/* =====================================================
   SECOND GATE
===================================================== */

#secondGate{
  scroll-margin-top:20px;
}

/* =====================================================
   SECOND GATE DESCRIPTION
===================================================== */

.gate-description{
  margin-top:20px;
  padding-top:15px;
  border-top:1px solid #e5e7f5;
  text-align:left;
  color:#666;
  font-size:14px;
  line-height:1.7;
}

.gate-description p{
  margin-bottom:8px;
}

/* =====================================================
   FINAL LINK
===================================================== */

.final-box{
  display:none;
  margin-top:20px;
  text-align:center;
}

.final-btn{
  display:inline-block;
  text-decoration:none;
  background:#f93683;
  color:#fff;
  font-weight:700;
  font-size:18px;
  padding:13px 28px;
  border-radius:7px;
}

.note{
  color:#777;
  font-size:13px;
  margin-top:8px;
}

/* =====================================================
   MOBILE
===================================================== */

@media(max-width:600px){

  .container{
    padding:10px;
  }

  .article-title{
    font-size:23px;
  }

  .article-content{
    padding:16px;
  }

  .logo{
    font-size:25px;
  }

  .ad-728{
    width:100%;
    min-height:90px;
  }

  .ad-728-inner{
    width:100%;
    max-width:100%;
  }

  .unlock-box{
    padding:17px 12px;
  }

  .get-btn{
    width:100%;
    max-width:250px;
  }

}

</style>

</head>

<body>

<!-- =====================================================
     HEADER
===================================================== -->

<header class="header">

<div class="logo">
MugenBD 🔗
</div>

</header>


<!-- =====================================================
     MAIN
===================================================== -->

<main class="container">

<div class="article-card">

<div class="article-content">

<h1 class="article-title">

Top 10 Best Anime You Should Watch

</h1>

<div class="meta">

MugenBD • Anime Guide

</div>


<!-- =====================================================
     AD #1 — 300x250
===================================================== -->

<div class="ad-box">

<div class="ad-300">

<script>

atOptions = {

  'key':
  '0dfcd9d1378790bebfaf30f6b4efb71d',

  'format':'iframe',

  'height':250,

  'width':300,

  'params':{}

};

</script>

<script
src="https://www.highperformanceformat.com/0dfcd9d1378790bebfaf30f6b4efb71d/invoke.js">
</script>

</div>

</div>


<!-- =====================================================
     FIRST GATE
===================================================== -->

<div
  id="firstGate"
  class="unlock-box"
>

<div class="unlock-title">

🔐 Continue to Article

</div>

<div class="unlock-text">

Click Continue and wait 10 seconds.

</div>

<button
  id="get1"
  class="get-btn"
  type="button"
>

Continue

</button>

<div
  id="count1"
  class="countdown"
>

Please wait <b>10</b> seconds...

</div>

</div>


<!-- =====================================================
     ARTICLE CONTENT
===================================================== -->

<div
  id="article"
  class="article-text"
>

<h2>

Top 10 Best Anime

</h2>

<p>

Anime has become one of the most popular forms
of entertainment around the world. From action
and adventure to fantasy and comedy, there are
countless series for every type of viewer.

</p>

<p>

Here are ten popular anime titles that are worth
checking out.

</p>


<ol>

<li>

<strong>One Piece</strong><br>

A legendary adventure following Monkey D. Luffy
and his crew as they search for the legendary
One Piece treasure.

</li>


<li>

<strong>Naruto Shippuden</strong><br>

A story about Naruto Uzumaki, a young ninja who
works hard to achieve his dream of becoming Hokage.

</li>


<li>

<strong>Attack on Titan</strong><br>

A dark action series featuring humanity's struggle
for survival against mysterious giant Titans.

</li>


<li>

<strong>Demon Slayer</strong><br>

Tanjiro Kamado begins a dangerous journey after
tragedy strikes his family and he discovers the
world of Demon Slayers.

</li>


<li>

<strong>Jujutsu Kaisen</strong><br>

A supernatural action anime following Yuji Itadori
as he becomes involved in the dangerous world
of cursed spirits.

</li>


<li>

<strong>Dragon Ball</strong><br>

A classic anime franchise filled with powerful
warriors, fantastic battles and unforgettable
adventures.

</li>


<li>

<strong>Death Note</strong><br>

A psychological thriller about a mysterious notebook
that gives its owner the power to determine who
lives and dies.

</li>


<li>

<strong>My Hero Academia</strong><br>

A superhero story about Izuku Midoriya and his
journey to become a professional hero.

</li>


<li>

<strong>Hunter x Hunter</strong><br>

Gon Freecss sets out on an adventure to become
a Hunter and discover the truth about his missing
father.

</li>


<li>

<strong>Fullmetal Alchemist: Brotherhood</strong><br>

Two brothers search for a way to restore their
bodies after a dangerous alchemy experiment
goes wrong.

</li>

</ol>


<p>

Every anime fan has different preferences, so
consider this list a starting point for discovering
new series.

</p>


<!-- =====================================================
     AD #2 — 728x90
===================================================== -->

<div class="ad-box">

<div class="ad-728">

<div class="ad-728-inner">

<script>

atOptions = {

  'key':
  '88a8f1e26c8dfb14584280ccb0c4d180',

  'format':'iframe',

  'height':90,

  'width':728,

  'params':{}

};

</script>

<script
src="https://www.highperformanceformat.com/88a8f1e26c8dfb14584280ccb0c4d180/invoke.js">
</script>

</div>

</div>

</div>


<!-- =====================================================
     SECOND GATE
===================================================== -->

<div
  id="secondGate"
  class="unlock-box"
>

<div class="unlock-title">

🔗 Your Link Is Almost Ready

</div>

<div class="unlock-text">

Please wait while we prepare your link.

</div>

<button
  id="get2"
  class="get-btn"
  type="button"
>

Get Link

</button>

<div
  id="count2"
  class="countdown"
>

Please wait <b>5</b> seconds...

</div>


<!-- =====================================================
     FINAL LINK
===================================================== -->

<div
  id="finalBox"
  class="final-box"
>

<a
  id="finalLink"
  class="final-btn"
  href="#"
>

Go to Link

</a>

<div class="note">

Your destination link is ready.

</div>

</div>


<!-- =====================================================
     SMALL ARTICLE DESCRIPTION
===================================================== -->

<div class="gate-description">

<p>

Anime offers countless stories, characters and
adventures for every type of viewer.

</p>

<p>

Whether you enjoy action, fantasy, comedy or
emotional stories, there is always something
new to discover.

</p>

</div>

</div>

</div>

</div>

</main>


<!-- =====================================================
     POPUNDER
===================================================== -->

<script
src="https://pl28212577.effectivecpmnetwork.com/7d/8f/a5/7d8fa5de8929ad62b16aac29b2f30620.js">
</script>


<!-- =====================================================
     SOCIAL BAR
===================================================== -->

<script
src="https://pl28212586.effectivecpmnetwork.com/77/91/35/779135afb82017d428bdb26e1ba8a7f5.js">
</script>


<script>

// =====================================================
// FINAL URL
// =====================================================

const finalUrl =
  ${JSON.stringify(finalUrl)};


// =====================================================
// ELEMENTS
// =====================================================

const get1 =
  document.getElementById("get1");

const count1 =
  document.getElementById("count1");

const secondGate =
  document.getElementById("secondGate");

const get2 =
  document.getElementById("get2");

const count2 =
  document.getElementById("count2");

const finalBox =
  document.getElementById("finalBox");

const finalLink =
  document.getElementById("finalLink");


// =====================================================
// STATE
// =====================================================

let firstStarted = false;

let secondStarted = false;


// =====================================================
// FIRST GATE
//
// CLICK #1
// → 10 SECOND COUNTDOWN
//
// CLICK #2 AFTER UNLOCK
// → SCROLL TO SECOND GATE
// =====================================================

get1.addEventListener(
  "click",
  function(){

    // =================================================
    // FIRST CLICK
    // =================================================

    if(!firstStarted){

      firstStarted = true;

      get1.disabled = true;

      get1.textContent =
        "Please wait...";

      count1.style.display =
        "block";


      let seconds = 10;


      count1.innerHTML =
        "Please wait <b>" +
        seconds +
        "</b> seconds...";


      const timer =
        setInterval(
          function(){

            seconds--;


            count1.innerHTML =
              "Please wait <b>" +
              seconds +
              "</b> seconds...";


            if(seconds <= 0){

              clearInterval(timer);


              count1.innerHTML =
                "✔ Ready";


              get1.disabled =
                false;


              get1.textContent =
                "Continue to Article";

            }

          },
          1000
        );


      return;

    }


    // =================================================
    // SECOND CLICK
    //
    // NOW SCROLL TO SECOND GATE
    // =================================================

    if(
      firstStarted &&
      !secondStarted &&
      get1.textContent ===
        "Continue to Article"
    ){

      get1.disabled =
        true;


      get1.textContent =
        "Opening Article...";


      secondGate.scrollIntoView({
        behavior:"smooth",
        block:"center"
      });


      // Wait for smooth scrolling

      setTimeout(
        function(){

          startSecondCountdown();

        },
        900
      );

    }

  }
);


// =====================================================
// SECOND GATE
//
// AUTO 5 SECOND COUNTDOWN
//
// NO SECOND BUTTON CLICK
// =====================================================

function startSecondCountdown(){

  if(secondStarted) return;

  secondStarted = true;


  // Hide Get Link button

  get2.style.display =
    "none";


  // Show countdown

  count2.style.display =
    "block";


  let seconds = 5;


  count2.innerHTML =
    "Please wait <b>" +
    seconds +
    "</b> seconds...";


  const timer =
    setInterval(
      function(){

        seconds--;


        count2.innerHTML =
          "Please wait <b>" +
          seconds +
          "</b> seconds...";


        if(seconds <= 0){

          clearInterval(timer);


          count2.innerHTML =
            "✔ Link Ready";


          // Set final destination

          finalLink.href =
            finalUrl;


          // Show final button

          finalBox.style.display =
            "block";

        }

      },
      1000
    );

}

</script>


</body>

</html>

`;

        return new Response(
          html,
          {
            status:200,
            headers:{
              "Content-Type":
                "text/html;charset=UTF-8",

              "Cache-Control":
                "no-store"
            }
          }
        );

      } catch(error){

        return new Response(
          "Server Error: " +
          error.message,
          {
            status:500,
            headers:{
              "Content-Type":
                "text/plain;charset=UTF-8"
            }
          }
        );
      }
    }

    // =====================================================
    // DEFAULT
    // =====================================================

    return new Response(
      "MugenBD Link API is working!",
      {
        status:200,
        headers:{
          "Content-Type":
            "text/plain;charset=UTF-8"
        }
      }
    );

  }
};
