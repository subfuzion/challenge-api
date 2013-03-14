Introduction
------------
[Challenge.gov][1] is an online challenge platform administered by the [U.S. General Services Administration][2] (GSA) in partnership with [ChallengePost][3] that empowers the U.S. Government and the public to bring the best ideas and top talent to bear on our nation’s most pressing challenges. This platform is the latest milestone in the Administration’s commitment to use prizes and challenges to promote innovation.


What is a Challenge?
--------------------
A challenge is exactly what the name suggests: it is a challenge by one party (a “seeker”) to a third party or parties (a “solver”) to identify a solution to a particular problem or reward contestants for accomplishing a particular goal. Prizes (monetary or non–monetary) often accompany challenges and contests.

Challenges can range from fairly simple (idea suggestions, creation of logos, videos, digital games and mobile applications) to proofs of concept, designs, or finished products that solve the grand challenges of the 21st century.

For more information, visit [Challenge.gov][1].


What is this project about (challenge-api)?
-------------------------------------------
This is an open source project to provide a REST API and JSON support on top the raw [XML feed][4] that is currently available. This API provides additional support for returning sorted and filtered responses.

The main goals of this project are to demonstrate building an API adapter over an existing federal data source and to facilitate mobile app development. As a proof-of-concept, the companion project is another open source project for an [iPhone App][5] that uses this API to provide similar functionality as the online portal at [Challenge.gov][1].


Technical Overview
------------------
The implementation is based on [Node.js][6] for the API (hosted by [Modulus.io][7]) and [MongoDB][8] for NoSQL data storage (hosted by [MongoLab][9]). Periodic harvesting of the [source XML feed][4] is scheduled by [cron.io][10]. The current schedule is four times per day.

The base URI is:
http://challengeapi-7312.onmodulus.net/

Current supported REST endpoints:

Endpoint  | Description 
--------- | ------------- 
feed      | Returns challenges in JSON format (http://challengeapi-7312.onmodulus.net/feed)    
harvest   | Invoked by cron.io periodically to harvest the source XML feed at Challenge.gov

The harvest endpoint expects to be supplied an authorization token by the cron.io service.


The MIT License (MIT)
---------------------
Copyright (c) 2013 Tony Pujals (temporarily until transferred to GSA)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[1]:  http://challenge.gov/
[2]:  http://www.gsa.gov/portal/category/100000/
[3]:  http://challengepost.com/
[4]:  http://challenge.gov/api/challenges.xml
[5]:  https://github.com/tonypujals/challenge-ios
[6]:  http://nodejs.org/
[7]:  https://modulus.io/
[8]:  http://www.mongodb.org/
[9]:  https://mongolab.com/
[10]: http://cron.io/


