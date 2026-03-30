// Test parse speaking data
const testData = {
  "contentType": "SPEAKING_CUECARD",
  "passageText": "{\"partInstruction\":\"<h2>Instruction</h2><p>In this part you will be given a topic and you have 1-2 minutes to talk about it.<br>Before you talk, you have 1 minute to think about what you're going to say, and you can make some notes if you wish.<br> </p><p><br>\\n\\n</p>\",\"topic\":\"<h2><br></h2><p>Describe an activity you would do when you are alone in your free time</p>\",\"shouldSayLabel\":\"You should say:\",\"bulletPoints\":[\"<ul><li><em>What do you do</em></li><li><em>How often do you do it</em></li><li><em>Why do you like to do this activity?</em></li><li><em>How do you feel when you do it?</em></li></ul>\",\"\",\"\"],\"closingSentence\":\"\",\"prepSeconds\":60}",
  "questions": [
    {
      "id": 17018,
      "questionText": "",
      "questionTypeCode": "SHORT_ANSWER"
    }
  ]
};

// Expected output after parsing:
const expected = {
  partInstruction: "Instruction\n\nIn this part you will be given a topic...",
  topic: "Describe an activity you would do when you are alone in your free time",
  shouldSayLabel: "You should say:",
  bulletPoints: [
    "What do you do",
    "How often do you do it",
    "Why do you like to do this activity?",
    "How do you feel when you do it?"
  ],
  closingSentence: "",
  prepSeconds: 60
};

console.log('Test data structure for Speaking Part 2');
console.log('Expected bulletPoints to be cleaned from HTML list tags');
