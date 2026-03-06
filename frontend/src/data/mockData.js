export const MOCK_READING_DATA = {
  candidateName: "NGUYEN VAN A",
  candidateId: "123456",
  testType: "Academic Reading",
  totalMinutes: 60,
  parts: [
    {
      id: "part-1",
      title: "Part 1",
      instruction: "Read the text and answer questions 1–13.",
      passageTitle: "The life and work of Marie Curie",
      passageContent: `
        <p>Marie Curie is probably the most famous woman scientist who has ever lived. Born Maria Sklodowska in Poland in 1867, she is famous for her work on radioactivity, and was twice a winner of the Nobel Prize. With her husband, Pierre Curie, and Henri Becquerel, she was awarded the 1903 Nobel Prize for Physics, and was then sole winner of the 1911 Nobel Prize for Chemistry. She was the first woman to win a Nobel Prize.</p>
        <p>From childhood, Marie was remarkable for her prodigious memory, and at the age of 16 won a gold medal on completion of her secondary education. Because her father lost his savings through bad investment, she then had to take work as a teacher. From her earnings she was able to finance her sister Bronia's medical studies in Paris, on the understanding that Bronia would, in turn, later help her to get an education.</p>
        <p>In 1891 this promise was fulfilled and Marie went to Paris and began to study at the Sorbonne (the University of Paris). She often worked far into the night and lived on little more than bread and butter and tea. She came first in the examination in the physical sciences in 1893, and in 1894 was placed second in the examination in mathematical sciences. It was not until the spring of that year that she was introduced to Pierre Curie.</p>
      `,
      questionsLabel: "Marie Curie's research on radioactivity",
      questions: [
        { id: "q1", number: 1, type: "multiple-choice", text: "Marie Curie's husband was a joint winner of both Marie's Nobel Prizes.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q2", number: 2, type: "multiple-choice", text: "Marie became interested in science when she was a child.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q3", number: 3, type: "multiple-choice", text: "Marie was able to attend the Sorbonne because of her sister's financial contribution.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q4", number: 4, type: "multiple-choice", text: "Marie stopped doing research for several years when her children were born.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q5", number: 5, type: "multiple-choice", text: "Marie took over the teaching position her husband had held.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q6", number: 6, type: "multiple-choice", text: "Marie's sister Bronia studied the medical uses of radioactivity.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q7", number: 7, type: "fill-in-the-blank", text: "When uranium was discovered to be radioactive, Marie Curie found that the element called _______ had the same property." },
        { id: "q8", number: 8, type: "fill-in-the-blank", text: "Marie and Pierre Curie's research into the radioactivity of the mineral known as _______ led to the discovery of two new elements." },
        { id: "q9", number: 9, type: "fill-in-the-blank", text: "In 1911, Marie Curie received recognition for her work on the element _______ ." },
        { id: "q10", number: 10, type: "fill-in-the-blank", text: "Marie and Irène Curie developed X-radiography which was used as a medical technique for _______ ." },
        { id: "q11", number: 11, type: "fill-in-the-blank", text: "Marie Curie saw the importance of collecting radioactive material both for research and for cases of _______ ." },
        { id: "q12", number: 12, type: "fill-in-the-blank", text: "The radioactive material stocked in Paris contributed to the discoveries in the 1930s of the _______ and of what was known as artificial radioactivity." },
        { id: "q13", number: 13, type: "fill-in-the-blank", text: "During her research, Marie Curie was exposed to radiation and as a result she suffered from _______ ." },
        {
          id: "q_multi",
          number: "M1",
          type: "multiple-choice",
          text: "Which of the following elements did Marie Curie discover? (Choose 2)",
          options: ["Uranium", "Polonium", "Gold", "Radium", "Iron"],
          allowMultipleAnswers: true
        },
        {
          id: "q_dnd_group_1",
          type: "matching_info",
          leftHeader: "People",
          rightHeader: "Staff Responsibilities",
          bankOptions: ["Finance", "Food", "Health", "Organization", "Sports"],
          subQuestions: [
            { id: "q21", number: 21, text: "Mary Brown" },
            { id: "q22", number: 22, text: "John Stevens" },
            { id: "q23", number: 23, text: "Alison Jones" }
          ],
          layout: "list"
        }
      ],
    },
    {
      id: "part-2",
      title: "Part 2",
      instruction: "Read the text and answer questions 14–26.",
      passageTitle: "Young children's sense of identity",
      passageContent: `
        <div class="heading-gap"  data-id="q14_head" data-number="14"></div><p><strong>A</strong> A sense of self develops in young children by degrees. The process can usefully be thought of in terms of the gradual emergence of two somewhat separate features: the self as a subject, and the self as an object. William James introduced the distinction in 1892, and contemporaries of his, such as Charles Cooley, added to the developing debate. Ever since then psychologists have continued building on the theory.</p>
        <div class="heading-gap"  data-id="q15_head" data-number="15"></div><p><strong>B</strong> According to James, a child's first step on the road to self-understanding can be seen as the recognition that he or she exists. This is an aspect of the self that he labelled 'self-as-subject', and he gave it various elements. These included an awareness of one's own agency (i.e. one's power to act), and an awareness of one's distinctiveness from other people. These features gradually emerge as infants explore their world and interact with caregivers. Cooley (1902) suggested that a sense of the self-as-subject was primarily concerned with being able to exercise power. He proposed that the earliest examples of this are an infant's attempts to control physical objects, such as toys or his or her own limbs. This is followed by attempts to affect the behaviour of other people. For example, infants learn that when they cry or smile someone responds to them.</p>
        <p><strong>C</strong> Another powerful source of information for infants about the effects they can have on the world around them is provided when others mimic them. Many parents spend a lot of time, particularly in the early months, copying their infant's vocalizations and expressions. In addition, young children enjoy looking in mirrors, where the movements they can see are dependent upon their own movements. This is not to say that infants recognize the reflection as their own image (a later development). However, Lewis and Brooks-Gunn (1979) suggest that infants' developing understanding that the movements they see in the mirror are contingent on their own, leads to a growing awareness that they are distinct from other people. This is because they, and only they, can change the reflection in the mirror.</p>
      `,
      questionsLabel: "Questions 14-26",
      questions: [

        {
          id: "q_matching_heading",
          type: "matching_heading",
          bankOptions: [
            "How a maths experiment actually reduced traffic congestion",
            "How a concept from one field of study was applied in another",
            "A lack of investment in driver training",
            "Areas of doubt and disagreement between experts"
          ],
          subQuestions: [
            { id: "q14_head", number: 14 },
            { id: "q15_head", number: 15 }
          ]
        },

        { id: "q22", number: 22, type: "multiple-choice", text: "The role of imitation in developing a sense of identity.", options: ["A", "B", "C", "D", "E"] },
        { id: "q23", number: 23, type: "multiple-choice", text: "The age at which children can usually identify a static image of themselves.", options: ["A", "B", "C", "D", "E"] },
        { id: "q17", number: 17, type: "fill-in-the-blank", text: "Cooley suggested that a sense of the self-as-subject was primarily concerned with being able to exercise _______ ." },
        { id: "q18", number: 18, type: "fill-in-the-blank", text: "Another source for infants about the effects they can have is provided when others _______ them." },
        { id: "q19", number: 19, type: "fill-in-the-blank", text: "This second step in the development of a full sense of self is what James called the _______ ." },
        { id: "q20", number: 20, type: "multiple-choice", text: "In paragraph D, Dunn points out that it is in relationships that the child's understanding of his- or herself emerges.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q21", number: 21, type: "multiple-choice", text: "Infants can easily express their aspect of the self directly.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q22", number: 22, type: "multiple-choice", text: "The development of a full sense of self is what James called the 'self-as-subject'.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q23", number: 23, type: "multiple-choice", text: "Parents spend time during early months criticizing vocalizations.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q24", number: 24, type: "multiple-choice", text: "William James introduced the distinction in 1892.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q25", number: 25, type: "multiple-choice", text: "Young children hate looking at mirrors.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q26", number: 26, type: "multiple-choice", text: "Lewis and Brooks-Gunn suggest infants don't understand the mirror reflection.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
      ],
    },
    {
      id: "part-3",
      title: "Part 3",
      instruction: "Read the text and answer questions 27–40.",
      passageTitle: "The secret of staying young",
      passageContent: `
        <p>Puchner and his colleagues tracked the aging process in 90 societies and found that the rate of physical decline is highly variable among human populations. In one isolated region...</p>
      `,
      questionsLabel: "Questions 27-40",
      questions: [
        { id: "q27", number: 27, type: "multiple-choice", text: "Question 27", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q28", number: 28, type: "multiple-choice", text: "Question 28", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q29", number: 29, type: "fill-in-the-blank", text: "The phenomenon is called _______ ." },
        { id: "q30", number: 30, type: "fill-in-the-blank", text: "We consider this _______ ." },
        { id: "q31", number: 31, type: "fill-in-the-blank", text: "The best description is _______ ." },
        { id: "q32", number: 32, type: "fill-in-the-blank", text: "Wait _______ ." },
        { id: "q33", number: 33, type: "fill-in-the-blank", text: "Test _______ ." },
        { id: "q34", number: 34, type: "multiple-choice", text: "Question 34", options: ["A", "B", "C", "D"] },
        { id: "q35", number: 35, type: "multiple-choice", text: "Question 35", options: ["A", "B", "C", "D"] },
        { id: "q36", number: 36, type: "multiple-choice", text: "Question 36", options: ["A", "B", "C", "D"] },
        { id: "q37", number: 37, type: "multiple-choice", text: "Question 37", options: ["A", "B", "C", "D"] },
        { id: "q38", number: 38, type: "multiple-choice", text: "Question 38", options: ["A", "B", "C", "D"] },
        { id: "q39", number: 39, type: "multiple-choice", text: "Question 39", options: ["A", "B", "C", "D"] },
        { id: "q40", number: 40, type: "multiple-choice", text: "Question 40", options: ["A", "B", "C", "D"] },
      ],
    },
  ],
};


export const MOCK_LISTENING_DATA = {
  candidateName: "NGUYEN VAN A",
  candidateId: "123456",
  testType: "Academic Listening",
  totalMinutes: 40,
  parts: [
    {
      id: "listen-part-1",
      title: "Part 1",
      instruction: "Listen and answer questions 1–10.",
      questionsLabel: "Questions 1-10",
      passageContent: "<h3>Job Enquiry</h3><p>Complete the notes below.<br>Write <b>ONE WORD AND/OR A NUMBER</b> for each answer.</p>",
      questions: [
        { id: "lq1", number: 1, type: "fill-in-the-blank", text: "Work at: a _______ " },
        { id: "lq2", number: 2, type: "fill-in-the-blank", text: "Pay: £ _______ an hour" },
        { id: "lq3", number: 3, type: "fill-in-the-blank", text: "Skill required: _______ " },
        { id: "lq4", number: 4, type: "fill-in-the-blank", text: "Additional benefits: free _______ " },
        { id: "lq5", number: 5, type: "fill-in-the-blank", text: "Name: _______ " },
        { id: "lq6", number: 6, type: "fill-in-the-blank", text: "Address: 21 _______ Road" },
        { id: "lq7", number: 7, type: "fill-in-the-blank", text: "Contact number: _______ " },
        { id: "lq8", number: 8, type: "fill-in-the-blank", text: "Available from: _______ " },
        { id: "lq9", number: 9, type: "fill-in-the-blank", text: "Interview scheduled for: _______ " },
        { id: "lq10", number: 10, type: "fill-in-the-blank", text: "Please bring: _______ " }
      ]
    },
    {
      id: "listen-part-2",
      title: "Part 2",
      instruction: "Listen and answer questions 11–20.",
      questionsLabel: "Questions 11-16",
      passageContent: "<h3>Sport Centre Upgrade</h3><p>Choose the correct letter, <b>A</b>, <b>B</b> or <b>C</b>.</p>",
      questions: [
        { id: "lq11", number: 11, type: "multiple-choice", text: "The main purpose of the upgrade is to", options: ["A. increase capacity.", "B. attract professional athletes.", "C. improve energy efficiency."] },
        { id: "lq12", number: 12, type: "multiple-choice", text: "When will the new swimming pool open?", options: ["A. next month", "B. in three months", "C. next year"] },
        { id: "lq13", number: 13, type: "multiple-choice", text: "The new gym equipment is funded by", options: ["A. the local council.", "B. a private sponsor.", "C. member donations."] },
        { id: "lq14", number: 14, type: "multiple-choice", text: "What is available for children?", options: ["A. free tennis lessons", "B. a new playground", "C. summer camp discounts"] },
        { id: "lq15", number: 15, type: "multiple-choice", text: "The sports centre will close at", options: ["A. 9:00 PM during weekdays.", "B. 10:00 PM on weekends.", "C. 11:00 PM every day."] },
        { id: "lq16", number: 16, type: "multiple-choice", text: "Membership fees will", options: ["A. stay the same.", "B. increase slightly.", "C. decrease for students."] },
        {
          id: "listen_dnd_1",
          type: "matching_info",
          leftHeader: "Locations",
          rightHeader: "Facilities",
          bankOptions: ["Café", "Sauna", "Childcare", "Squash courts"],
          subQuestions: [
            { id: "lq17", number: 17, text: "East Wing" },
            { id: "lq18", number: 18, text: "West Wing" },
            { id: "lq19", number: 19, text: "Basement" },
            { id: "lq20", number: 20, text: "First Floor" }
          ]
        }
      ]
    },
    {
      id: "listen-part-3",
      title: "Part 3",
      instruction: "Listen and answer questions 21–30.",
      questionsLabel: "Questions 21-30",
      passageContent: "<h3>University Project Discussion</h3>",
      questions: [
        {
          id: "listen_dnd_2",
          type: "matching_info",
          leftHeader: "Student",
          rightHeader: "Assigned Task",
          bankOptions: ["Literature review", "Data collection", "Statistical analysis", "Proofreading", "Presentation design"],
          subQuestions: [
            { id: "lq21", number: 21, text: "Alice" },
            { id: "lq22", number: 22, text: "Bob" },
            { id: "lq23", number: 23, text: "Charlie" },
            { id: "lq24", number: 24, text: "Diana" }
          ]
        },
        { id: "lq25", number: 25, type: "multiple-choice", text: "What is the main topic of the presentation?", options: ["A. Climate change impacts", "B. Renewable energy sources", "C. Wildlife conservation"] },
        { id: "lq26", number: 26, type: "multiple-choice", text: "How long should the presentation be?", options: ["A. 10 minutes", "B. 20 minutes", "C. 30 minutes"] },
        { id: "lq27", number: 27, type: "multiple-choice", text: "Who will present the introduction?", options: ["A. Alice", "B. Charlie", "C. Diana"] },
        { id: "lq28", number: 28, type: "multiple-choice", text: "The students agree to limit the scope of the project.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "lq29", number: 29, type: "multiple-choice", text: "They will meet again on Friday.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "lq30", number: 30, type: "multiple-choice", text: "The professor has already approved their topic.", options: ["TRUE", "FALSE", "NOT GIVEN"] }
      ]
    },
    {
      id: "listen-part-4",
      title: "Part 4",
      instruction: "Listen and answer questions 31–40.",
      questionsLabel: "Questions 31-40",
      passageContent: "<h3>History of Architecture</h3><p>Complete the notes below.</p>",
      questions: [
        { id: "lq31", number: 31, type: "fill-in-the-blank", text: "The earliest buildings were made of _______ " },
        { id: "lq32", number: 32, type: "fill-in-the-blank", text: "The Romans introduced the use of _______ " },
        { id: "lq33", number: 33, type: "fill-in-the-blank", text: "Gothic architecture is known for its _______ " },
        { id: "lq34", number: 34, type: "fill-in-the-blank", text: "The Renaissance period saw a revival of _______ styles." },
        { id: "lq35", number: 35, type: "fill-in-the-blank", text: "Modern architecture relies heavily on steel and _______ " },
        { id: "lq36", number: 36, type: "fill-in-the-blank", text: "A key feature of Brutalism is exposed _______ " },
        { id: "lq37", number: 37, type: "fill-in-the-blank", text: "Sustainable design focuses on reducing _______ " },
        { id: "lq38", number: 38, type: "fill-in-the-blank", text: "Smart buildings use technology to control _______ " },
        { id: "lq39", number: 39, type: "fill-in-the-blank", text: "The future might include cities built under _______ " },
        { id: "lq40", number: 40, type: "fill-in-the-blank", text: "Space exploration could lead to architecture on _______ " }
      ]
    }
  ]
};
