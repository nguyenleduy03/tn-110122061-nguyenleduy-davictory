export const MOCK_READING_DATA = {
  candidateName: "NGUYEN VAN A",
  candidateId: "123456",
  testType: "Academic Reading",
  totalMinutes: 60,
  parts: [
    // ======== PART 1: Questions 1–13 ========
    {
      id: "part-1",
      title: "Part 1",
      instruction: "Read the text below and answer questions 1–13.",
      passageTitle: "The life and work of Marie Curie",
      passageContent: `
        <p>Marie Curie is probably the most famous woman scientist who has ever lived. Born Maria Sklodowska in Poland in 1867, she is famous for her work on radioactivity, and was twice a winner of the Nobel Prize. With her husband, Pierre Curie, and Henri Becquerel, she was awarded the 1903 Nobel Prize for Physics, and was then sole winner of the 1911 Nobel Prize for Chemistry. She was the first woman to win a Nobel Prize.</p>
        <p>From childhood, Marie was remarkable for her prodigious memory, and at the age of 16 won a gold medal on completion of her secondary education. Because her father lost his savings through bad investment, she then had to take work as a teacher. From her earnings she was able to finance her sister Bronia's medical studies in Paris, on the understanding that Bronia would, in turn, later help her to get an education.</p>
        <p>In 1891 this promise was fulfilled and Marie went to Paris and began to study at the Sorbonne (the University of Paris). She often worked far into the night and lived on little more than bread and butter and tea. She came first in the examination in the physical sciences in 1893, and in 1894 was placed second in the examination in mathematical sciences. It was not until the spring of that year that she was introduced to Pierre Curie.</p>
        <p>Their marriage in 1895 marked the start of a partnership that was soon to achieve results of world significance. Following Henri Becquerel's discovery in 1896 of a new phenomenon, which Marie later called 'radioactivity', Marie Curie decided to find out if the radioactivity discovered in uranium was to be found in other elements. She discovered that this was true for thorium.</p>
        <p>Turning her attention to minerals, she found her interest drawn to pitchblende, a mineral whose radioactivity, superior to that of pure uranium, could be explained only by the presence in the ore of small quantities of an unknown substance of very high activity. Pierre Curie joined her in the work that she had undertaken to resolve this problem, and that led to the discovery of the new elements, polonium and radium.</p>
        <p>While Pierre Curie devoted himself chiefly to the physical study of the new radiations, Marie Curie struggled to obtain pure radium in the metallic state. This was achieved with the help of the chemist André-Louis Debierne, one of Pierre Curie's pupils. Based on the results of this research, Marie Curie received her Doctorate of Science, and in 1903 Marie and Pierre shared with Becquerel the Nobel Prize for Physics for the discovery of radioactivity.</p>
        <p>The births of Marie's two daughters, Irène and Eve, in 1897 and 1904 failed to interrupt her scientific work. She was appointed lecturer in physics at the École Normale Supérieure for girls in Sèvres, France (1900), and introduced a method of teaching based on experimental demonstrations. In December 1904 she was appointed chief assistant in the laboratory directed by Pierre Curie.</p>
        <p>The sudden death of her husband in 1906 was a bitter blow to Marie Curie, but was also a turning point in her career: henceforth she was to devote all her energy to completing alone the scientific work that they had undertaken. On May 13, 1906, she was appointed to the professorship that had been left vacant on her husband's death, becoming the first woman to teach at the Sorbonne. In 1911 she was awarded the Nobel Prize for Chemistry for the isolation of a pure form of radium.</p>
        <p>During World War I, Marie Curie, with the help of her daughter Irène, devoted herself to the development of the use of X-radiography, including the mobile units which came to be known as 'Little Curies', used for the treatment of wounded soldiers. In 1918 the Radium Institute, whose staff Irène had joined, began to operate in earnest, and became a centre for nuclear physics and chemistry.</p>
        <p>Marie Curie, now at the highest point of her fame and, from 1922, a member of the Academy of Medicine, researched the chemistry of radioactive substances and their medical applications. In 1921, accompanied by her two daughters, Marie Curie made a triumphant journey to the United States to raise funds for research on radium. Women there presented her with a gram of radium for her campaign.</p>
        <p>One of Marie Curie's outstanding achievements was to have understood the need to accumulate intense radioactive sources, not only to treat illness but also to maintain an abundant supply for research. The existence in Paris at the Radium Institute of a stock of 1.5 grams of radium made a decisive contribution to the success of the experiments undertaken in the years around 1930. This work prepared the way for the discovery of the neutron by Sir James Chadwick and, above all, for the discovery in 1934 by Irène and Frédéric Joliot-Curie of artificial radioactivity. A few months after this discovery, Marie Curie died as a result of leukaemia caused by exposure to radiation. She had often carried test tubes containing radioactive isotopes in her pocket, remarking on the pretty blue-green light they gave off.</p>
      `,
      questionsLabel: "Questions 1–13",
      questions: [
        // Q1-6: TRUE / FALSE / NOT GIVEN
        { id: "q1", number: 1, type: "multiple-choice", text: "Marie Curie's husband was a joint winner of both Marie's Nobel Prizes.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q2", number: 2, type: "multiple-choice", text: "Marie became interested in science when she was a child.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q3", number: 3, type: "multiple-choice", text: "Marie was able to attend the Sorbonne because of her sister's financial contribution.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q4", number: 4, type: "multiple-choice", text: "Marie stopped doing research for several years when her children were born.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q5", number: 5, type: "multiple-choice", text: "Marie took over the teaching position her husband had held.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "q6", number: 6, type: "multiple-choice", text: "Marie's sister Bronia studied the medical uses of radioactivity.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        // Q7-13: Fill in the blank — note completion
        { id: "q7", number: 7, type: "fill-in-the-blank", text: "When uranium was discovered to be radioactive, Marie Curie found that the element called _______ had the same property." },
        { id: "q8", number: 8, type: "fill-in-the-blank", text: "Marie and Pierre Curie's research into the radioactivity of the mineral known as _______ led to the discovery of two new elements." },
        { id: "q9", number: 9, type: "fill-in-the-blank", text: "In 1911, Marie Curie received recognition for her work on the element _______ ." },
        { id: "q10", number: 10, type: "fill-in-the-blank", text: "Marie and Irène Curie developed X-radiography which was used as a medical technique for _______ ." },
        { id: "q11", number: 11, type: "fill-in-the-blank", text: "Marie Curie saw the importance of collecting radioactive material both for research and for cases of _______ ." },
        { id: "q12", number: 12, type: "fill-in-the-blank", text: "The radioactive material stocked in Paris contributed to the discoveries in the 1930s of the _______ and of what was known as artificial radioactivity." },
        { id: "q13", number: 13, type: "fill-in-the-blank", text: "During her research, Marie Curie was exposed to radiation and as a result she suffered from _______ ." },
      ],
    },
    // ======== PART 2: Questions 14–26 ========
    {
      id: "part-2",
      title: "Part 2",
      instruction: "Read the text below and answer questions 14–26.",
      passageTitle: "Young children's sense of identity",
      passageContent: `
        <div class="heading-gap" data-id="q14_head" data-number="14"></div>
        <p><strong>A</strong> A sense of self develops in young children by degrees. The process can usefully be thought of in terms of the gradual emergence of two somewhat separate features: the self as a subject, and the self as an object. William James introduced the distinction in 1892, and contemporaries of his, such as Charles Cooley, added to the developing debate. Ever since then psychologists have continued building on the theory.</p>
        <div class="heading-gap" data-id="q15_head" data-number="15"></div>
        <p><strong>B</strong> According to James, a child's first step on the road to self-understanding can be seen as the recognition that he or she exists. This is an aspect of the self that he labelled 'self-as-subject', and he gave it various elements. These included an awareness of one's own agency (i.e. one's power to act), and an awareness of one's distinctiveness from other people. These features gradually emerge as infants explore their world and interact with caregivers. Cooley (1902) suggested that a sense of the self-as-subject was primarily concerned with being able to exercise power. He proposed that the earliest examples of this are an infant's attempts to control physical objects, such as toys or his or her own limbs.</p>
        <div class="heading-gap" data-id="q16_head" data-number="16"></div>
        <p><strong>C</strong> Another powerful source of information for infants about the effects they can have on the world around them is provided when others mimic them. Many parents spend a lot of time, particularly in the early months, copying their infant's vocalizations and expressions. In addition, young children enjoy looking in mirrors, where the movements they can see are dependent upon their own movements.</p>
        <div class="heading-gap" data-id="q17_head" data-number="17"></div>
        <p><strong>D</strong> Dunn (1988) has argued that a full sense of self, and at the same time an understanding of other people's emotions, develops primarily through the child's interactions with the people that matter most to them. For the majority of children, this means their relationships with parents and, later, their siblings. It is in this social context, Dunn argues, that children learn about their own feelings and desires and the feelings of others.</p>
        <div class="heading-gap" data-id="q18_head" data-number="18"></div>
        <p><strong>E</strong> By about the age of 18 months, many children begin to make explicit verbal reference to themselves. It is precisely this aspect of the self that James called 'the self-as-object'. It refers to a child's growing ability to think about and to evaluate him or herself. The emergence of words like 'me', 'mine' and 'I' demonstrates that children are developing a categorical self — a sense of themselves as having recognisable properties and qualities.</p>
      `,
      questionsLabel: "Questions 14–26",
      questions: [
        // Q14-18: Matching Headings (drag-drop into passage heading gaps)
        {
          id: "q_matching_heading",
          type: "matching_heading",
          bankOptions: [
            "The role of social relationships in developing identity",
            "How the self develops through stages",
            "Learning about self through imitation and mirrors",
            "The distinction between subjective and objective self",
            "Children's first steps towards self-awareness",
            "The explicit verbal recognition of self"
          ],
          subQuestions: [
            { id: "q14_head", number: 14 },
            { id: "q15_head", number: 15 },
            { id: "q16_head", number: 16 },
            { id: "q17_head", number: 17 },
            { id: "q18_head", number: 18 }
          ]
        },
        // Q19-22: Summary Completion
        {
          id: "group-19-22",
          type: "summary-completion",
          title: "The development of a child's sense of self",
          text: "William James was one of the first psychologists to study the concept of identity in children. He identified two main aspects: the self as a [19] and the self as an object. According to Cooley, young children first develop a sense of self through trying to control [20] around them. Dunn later emphasised that children develop understanding of self through [21] with family members. By around 18 months, children start using words like 'me' to show they have developed what is known as the [22] self.",
          subQuestions: [
            { id: "q19", number: 19 },
            { id: "q20", number: 20 },
            { id: "q21", number: 21 },
            { id: "q22", number: 22 }
          ]
        },
        // Q23-26: Multiple Choice — paragraph matching
        { id: "q23", number: 23, type: "multiple-choice", text: "The role of imitation in developing a sense of identity.", options: ["A", "B", "C", "D", "E"] },
        { id: "q24", number: 24, type: "multiple-choice", text: "The age at which children can usually identify themselves verbally.", options: ["A", "B", "C", "D", "E"] },
        { id: "q25", number: 25, type: "multiple-choice", text: "The theory that relationships are central to developing self-awareness.", options: ["A", "B", "C", "D", "E"] },
        { id: "q26", number: 26, type: "multiple-choice", text: "The first academic distinction between two types of self.", options: ["A", "B", "C", "D", "E"] },
      ],
    },
    // ======== PART 3: Questions 27–40 ========
    {
      id: "part-3",
      title: "Part 3",
      instruction: "Read the text below and answer questions 27–40.",
      passageTitle: "The secret of staying young",
      passageContent: `
        <p><strong>A</strong> Ageing is a natural process that every human experiences, yet the rate at which individuals age varies enormously both between and within populations. For many years, scientists assumed that the ageing process was largely governed by genetic factors. However, more recent research has revealed that environmental and lifestyle factors play a crucial role in determining how quickly or slowly we age.</p>
        <p><strong>B</strong> One of the most significant discoveries in the field of ageing research came from studies of isolated communities around the world. In Okinawa, Japan, researchers found that the local population had an unusually high proportion of centenarians — people who live to 100 or more. Their diet, rich in vegetables, tofu and fish but low in calories, appeared to be a major contributing factor. Similarly, in Sardinia, Italy, a cluster of villages in the mountainous interior has produced a remarkable number of male centenarians.</p>
        <p><strong>C</strong> The concept of 'Blue Zones' — regions of the world where people live measurably longer lives — was popularised by the writer Dan Buettner. He identified five such zones: Okinawa, Sardinia, the Nicoya Peninsula in Costa Rica, Ikaria in Greece, and among the Seventh-day Adventists in Loma Linda, California. What these diverse communities share are certain lifestyle characteristics: regular physical activity, a sense of purpose, stress-reduction practices, moderate caloric intake, a plant-based diet, moderate alcohol consumption, engagement in social life, and strong family connections.</p>
        <p><strong>D</strong> At the molecular level, ageing is associated with the shortening of telomeres — the protective caps at the ends of chromosomes. Each time a cell divides, its telomeres get slightly shorter. When they become too short, the cell can no longer divide and becomes inactive or dies. Research led by Elizabeth Blackburn, who won the Nobel Prize for her work on telomeres, has shown that chronic stress accelerates telomere shortening, effectively speeding up the ageing process at a cellular level.</p>
        <p><strong>E</strong> Exercise has been shown to have a profound effect on the ageing process. Studies consistently demonstrate that regular physical activity helps maintain muscle mass, bone density and cardiovascular health. More surprising is the finding that exercise can actually lengthen telomeres. A 2009 study found that long-distance runners had significantly longer telomeres than sedentary individuals of the same age, suggesting that vigorous exercise may literally turn back the biological clock.</p>
        <p><strong>F</strong> Caloric restriction — consuming fewer calories while maintaining adequate nutrition — is the only dietary intervention consistently shown to extend lifespan in animal studies. Experiments with mice, rats and monkeys have demonstrated that reducing caloric intake by 20-40% can increase lifespan by up to 50%. Whether this applies to humans remains debatable, but proponents of caloric restriction point to the longevity of Okinawans, who traditionally practise a form of this called 'hara hachi bu' — eating until they are only 80% full.</p>
        <p><strong>G</strong> Social engagement also appears to be critical for healthy ageing. Studies have found that people with strong social networks tend to live longer and have better cognitive health than those who are more isolated. The Framingham Heart Study, one of the longest-running health studies in history, has consistently demonstrated that social connections are as important as exercise and diet in preventing chronic disease and premature death.</p>
        <p><strong>H</strong> Despite these findings, the quest for pharmaceutical solutions to ageing continues to attract enormous investment. Several biotechnology companies are now working on drugs that target the ageing process itself, rather than any specific age-related disease. One promising avenue involves senolytics — drugs designed to clear the body of senescent (ageing) cells that accumulate over time and contribute to inflammation and tissue dysfunction. Early clinical trials have shown encouraging results.</p>
      `,
      questionsLabel: "Questions 27–40",
      questions: [
        // Q27-30: Multiple Choice (ABCD)
        { id: "q27", number: 27, type: "multiple-choice", text: "What did early scientists believe was the main factor in ageing?", options: ["A. environmental conditions", "B. genetic factors", "C. dietary habits", "D. social connections"] },
        { id: "q28", number: 28, type: "multiple-choice", text: "What is significant about the communities in Okinawa and Sardinia?", options: ["A. They have the oldest recorded humans.", "B. They have an unusually high number of centenarians.", "C. They consume very little food.", "D. They exercise more than most populations."] },
        { id: "q29", number: 29, type: "multiple-choice", text: "What happens when telomeres become too short?", options: ["A. The cell grows faster.", "B. The cell repairs itself.", "C. The cell becomes inactive or dies.", "D. The cell divides more rapidly."] },
        { id: "q30", number: 30, type: "multiple-choice", text: "What does 'hara hachi bu' mean?", options: ["A. eating only vegetables", "B. fasting one day per week", "C. eating until 80% full", "D. consuming raw food only"] },
        // Q31-35: Matching Information (drag-drop)
        {
          id: "q_matching_info",
          type: "matching_info",
          leftHeader: "Statement",
          rightHeader: "Paragraph",
          bankOptions: ["A", "B", "C", "D", "E", "F", "G", "H"],
          subQuestions: [
            { id: "q31", number: 31, text: "a reference to a specific experiment showing exercise can reverse biological ageing" },
            { id: "q32", number: 32, text: "mention of a long-running health study demonstrating the importance of social ties" },
            { id: "q33", number: 33, text: "a description of common lifestyle features shared by long-lived communities" },
            { id: "q34", number: 34, text: "an explanation of how stress affects the body at a cellular level" },
            { id: "q35", number: 35, text: "details of pharmaceutical research aimed at the ageing process itself" }
          ],
          layout: "list"
        },
        // Q36-37: Multiple Choice (multi-select — choose TWO)
        { id: "q36", number: 36, type: "multiple-choice", allowMultipleAnswers: true, text: "Which TWO of the following are described as characteristics of Blue Zone communities?", options: ["A. high levels of meat consumption", "B. regular physical activity", "C. working long office hours", "D. moderate caloric intake", "E. frequent international travel"] },
        { id: "q37", number: 37, type: "multiple-choice", allowMultipleAnswers: true, text: "Which TWO findings about ageing are mentioned in relation to molecular research?", options: ["A. Telomeres protect the ends of chromosomes.", "B. Exercise has no effect on cell division.", "C. Chronic stress speeds up telomere shortening.", "D. Genes are the sole factor in ageing.", "E. Senescent cells improve tissue function."] },
        // Q38-40: Image Drag & Drop — Map labelling
        {
          id: "q_image_dd",
          type: "image-drag-drop",
          instruction: "Label the map below. Drag the correct letter A–H to boxes 38–40.",
          imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/PlaceholderLC.png/200px-PlaceholderLC.png",
          bankOptions: ["Swimming Pool", "Tennis Court", "Car Park", "Reception", "Restaurant", "Library", "Gym", "Playground"],
          subQuestions: [
            { id: "q38", number: 38, text: "Area in the centre of the map", top: "50%", left: "50%" },
            { id: "q39", number: 39, text: "Structure at the southern end", top: "80%", left: "40%" },
            { id: "q40", number: 40, text: "Building on the west side", top: "55%", left: "15%" },
          ],
        },
      ],
    },
  ],
};


export const MOCK_LISTENING_DATA = {
  candidateName: "NGUYEN VAN A",
  candidateId: "123456",
  testType: "Academic Listening",
  totalMinutes: 40,
  audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  parts: [
    // ======== SECTION 1: Questions 1–10 (Form completion) ========
    {
      id: "listen-part-1",
      title: "Part 1",
      instruction: "Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.",
      questionsLabel: "Questions 1–10",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      passageContent: "<h3>Holiday Rental Enquiry</h3><p>Complete the notes below.<br>Write <b>ONE WORD AND/OR A NUMBER</b> for each answer.</p>",
      questions: [
        { id: "lq1", number: 1, type: "fill-in-the-blank", text: "Type of property: a _______ by the sea" },
        { id: "lq2", number: 2, type: "fill-in-the-blank", text: "Number of bedrooms needed: _______ " },
        { id: "lq3", number: 3, type: "fill-in-the-blank", text: "Arrival date: 17th _______ " },
        { id: "lq4", number: 4, type: "fill-in-the-blank", text: "Length of stay: _______ nights" },
        { id: "lq5", number: 5, type: "fill-in-the-blank", text: "Name of caller: Mrs _______ " },
        { id: "lq6", number: 6, type: "fill-in-the-blank", text: "Address: 27 _______ Road, Brixham" },
        { id: "lq7", number: 7, type: "fill-in-the-blank", text: "Postcode: BX7 _______ " },
        { id: "lq8", number: 8, type: "fill-in-the-blank", text: "Phone number: 01onal _______ " },
        { id: "lq9", number: 9, type: "fill-in-the-blank", text: "Special requirement: sea _______ from the room" },
        { id: "lq10", number: 10, type: "fill-in-the-blank", text: "Total cost per week: £ _______ " }
      ]
    },
    // ======== SECTION 2: Questions 11–20 (MC + Matching) ========
    {
      id: "listen-part-2",
      title: "Part 2",
      instruction: "Listen and answer questions 11–20.",
      questionsLabel: "Questions 11–20",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      passageContent: "<h3>Riverview Sports Centre</h3><p>Questions 11–16: Choose the correct letter, <b>A</b>, <b>B</b> or <b>C</b>.</p>",
      questions: [
        { id: "lq11", number: 11, type: "multiple-choice", text: "The main reason for the upgrade of the sports centre is to", options: ["A. increase the number of members.", "B. replace outdated equipment.", "C. improve energy efficiency."] },
        { id: "lq12", number: 12, type: "multiple-choice", text: "The new swimming pool will be", options: ["A. 25 metres long.", "B. 50 metres long.", "C. indoor and outdoor."] },
        { id: "lq13", number: 13, type: "multiple-choice", text: "The gym equipment is funded by", options: ["A. the local council.", "B. a private sponsor.", "C. membership fee increases."] },
        { id: "lq14", number: 14, type: "multiple-choice", text: "What is now available for children under 10?", options: ["A. free tennis coaching", "B. a dedicated play area", "C. swimming lessons on weekdays"] },
        { id: "lq15", number: 15, type: "multiple-choice", text: "The centre will now close at", options: ["A. 9:30 PM on weekdays.", "B. 10:00 PM every day.", "C. 11:00 PM at weekends."] },
        { id: "lq16", number: 16, type: "multiple-choice", text: "Membership fees will", options: ["A. remain the same for one year.", "B. increase by 10% next month.", "C. decrease for students."] },
        // Q17-20: Matching (drag-drop)
        {
          id: "listen_dnd_1",
          type: "matching_info",
          leftHeader: "Area of centre",
          rightHeader: "New facility",
          bankOptions: ["Café", "Sauna", "Childcare room", "Squash courts", "Yoga studio"],
          subQuestions: [
            { id: "lq17", number: 17, text: "Ground floor, East Wing" },
            { id: "lq18", number: 18, text: "Ground floor, West Wing" },
            { id: "lq19", number: 19, text: "Basement" },
            { id: "lq20", number: 20, text: "First floor" }
          ]
        }
      ]
    },
    // ======== SECTION 3: Questions 21–30 (Matching + MC + T/F/NG) ========
    {
      id: "listen-part-3",
      title: "Part 3",
      instruction: "Listen and answer questions 21–30.",
      questionsLabel: "Questions 21–30",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      passageContent: "<h3>University Research Project Discussion</h3><p>Two students, Alice and Bob, discuss their research project with their tutor, Dr Chen.</p>",
      questions: [
        // Q21-23: Matching (who will do what)
        {
          id: "listen_dnd_2",
          type: "matching_info",
          leftHeader: "Task",
          rightHeader: "Person responsible",
          bankOptions: ["Alice", "Bob", "Dr Chen", "Both students"],
          subQuestions: [
            { id: "lq21", number: 21, text: "Literature review" },
            { id: "lq22", number: 22, text: "Data collection" },
            { id: "lq23", number: 23, text: "Statistical analysis" }
          ]
        },
        // Q24-27: Multiple choice
        { id: "lq24", number: 24, type: "multiple-choice", text: "What is the main topic of their research project?", options: ["A. The effect of social media on student wellbeing", "B. Renewable energy adoption in urban areas", "C. Consumer attitudes towards online shopping"] },
        { id: "lq25", number: 25, type: "multiple-choice", text: "How many participants do they plan to survey?", options: ["A. 50", "B. 100", "C. 200"] },
        { id: "lq26", number: 26, type: "multiple-choice", text: "When is the project deadline?", options: ["A. end of March", "B. mid-April", "C. beginning of May"] },
        { id: "lq27", number: 27, type: "multiple-choice", text: "Dr Chen recommends they focus on", options: ["A. qualitative data only.", "B. a mixed-methods approach.", "C. quantitative data only."] },
        // Q28-30: TRUE / FALSE / NOT GIVEN
        { id: "lq28", number: 28, type: "multiple-choice", text: "Alice has already started writing the introduction.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "lq29", number: 29, type: "multiple-choice", text: "Bob will design the survey questionnaire alone.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
        { id: "lq30", number: 30, type: "multiple-choice", text: "The tutor is satisfied with their initial proposal.", options: ["TRUE", "FALSE", "NOT GIVEN"] },
      ]
    },
    // ======== SECTION 4: Questions 31–40 (Sentence completion) ========
    {
      id: "listen-part-4",
      title: "Part 4",
      instruction: "Complete the notes below. Write ONE WORD ONLY for each answer.",
      questionsLabel: "Questions 31–40",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      passageContent: "<h3>Lecture: The History of Urban Planning</h3><p>Complete the notes below.<br>Write <b>ONE WORD ONLY</b> for each answer.</p>",
      questions: [
        { id: "lq31", number: 31, type: "fill-in-the-blank", text: "The earliest known planned cities were built in ancient _______ ." },
        { id: "lq32", number: 32, type: "fill-in-the-blank", text: "Greek cities were designed around a central open space called the _______ ." },
        { id: "lq33", number: 33, type: "fill-in-the-blank", text: "Roman cities typically followed a _______ layout based on two main streets." },
        { id: "lq34", number: 34, type: "fill-in-the-blank", text: "During the Middle Ages, most European cities grew without any formal _______ ." },
        { id: "lq35", number: 35, type: "fill-in-the-blank", text: "Baron Haussmann redesigned the _______ of Paris in the 19th century." },
        { id: "lq36", number: 36, type: "fill-in-the-blank", text: "The 'Garden City' concept was proposed by Ebenezer _______ ." },
        { id: "lq37", number: 37, type: "fill-in-the-blank", text: "After World War II, many cities prioritised building _______ for cars." },
        { id: "lq38", number: 38, type: "fill-in-the-blank", text: "Modern sustainable planning focuses on reducing urban _______ ." },
        { id: "lq39", number: 39, type: "fill-in-the-blank", text: "The concept of '15-minute cities' aims to ensure all services are within walking _______ ." },
        { id: "lq40", number: 40, type: "fill-in-the-blank", text: "Smart cities use _______ and sensors to manage urban infrastructure." }
      ]
    }
  ],
};


export const MOCK_WRITING_DATA = {
  candidateName: "NGUYEN VAN A",
  candidateId: "123456",
  testType: "Academic Writing",
  totalMinutes: 60,
  parts: [
    {
      id: "writing-task-1",
      title: "Task 1",
      taskLabel: "Writing Task 1",
      minWords: 150,
      recommendedMinutes: 20,
      instruction: `You should spend about 20 minutes on this task.

The bar chart below shows the percentage of students at one UK university who used various facilities in the library during one week in 2019.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
      taskImageSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" style="font-family:Arial,sans-serif;font-size:12px;">
  <rect width="520" height="320" fill="#fff" stroke="#ddd"/>
  <text x="14" y="165" transform="rotate(-90,14,165)" text-anchor="middle" font-size="11" fill="#555">Percentage of students (%)</text>
  <text x="260" y="22" text-anchor="middle" font-weight="bold" font-size="12" fill="#222">Library Facilities Used by Students (2019)</text>
  <line x1="70" y1="40" x2="70" y2="265" stroke="#ccc" stroke-width="1"/>
  <line x1="70" y1="265" x2="490" y2="265" stroke="#ccc" stroke-width="1"/>
  <line x1="70" y1="225" x2="490" y2="225" stroke="#eee" stroke-dasharray="4,3"/>
  <line x1="70" y1="185" x2="490" y2="185" stroke="#eee" stroke-dasharray="4,3"/>
  <line x1="70" y1="145" x2="490" y2="145" stroke="#eee" stroke-dasharray="4,3"/>
  <line x1="70" y1="105" x2="490" y2="105" stroke="#eee" stroke-dasharray="4,3"/>
  <line x1="70" y1="65" x2="490" y2="65" stroke="#eee" stroke-dasharray="4,3"/>
  <text x="62" y="269" text-anchor="end" font-size="11" fill="#555">0</text>
  <text x="62" y="229" text-anchor="end" font-size="11" fill="#555">10</text>
  <text x="62" y="189" text-anchor="end" font-size="11" fill="#555">20</text>
  <text x="62" y="149" text-anchor="end" font-size="11" fill="#555">30</text>
  <text x="62" y="109" text-anchor="end" font-size="11" fill="#555">40</text>
  <text x="62" y="69" text-anchor="end" font-size="11" fill="#555">50</text>
  <rect x="80" y="85" width="50" height="180" fill="#4472c4"/>
  <text x="105" y="80" text-anchor="middle" font-size="10" fill="#333">45%</text>
  <rect x="150" y="113" width="50" height="152" fill="#ed7d31"/>
  <text x="175" y="108" text-anchor="middle" font-size="10" fill="#333">38%</text>
  <rect x="220" y="165" width="50" height="100" fill="#a9d18e"/>
  <text x="245" y="160" text-anchor="middle" font-size="10" fill="#333">25%</text>
  <rect x="290" y="177" width="50" height="88" fill="#ffc000"/>
  <text x="315" y="172" text-anchor="middle" font-size="10" fill="#333">22%</text>
  <rect x="360" y="193" width="50" height="72" fill="#7030a0"/>
  <text x="385" y="188" text-anchor="middle" font-size="10" fill="#333">18%</text>
  <rect x="430" y="217" width="50" height="48" fill="#e74c3c"/>
  <text x="455" y="212" text-anchor="middle" font-size="10" fill="#333">12%</text>
  <text x="105" y="282" text-anchor="middle" font-size="10" fill="#555">Computers</text>
  <text x="175" y="282" text-anchor="middle" font-size="10" fill="#555">Study</text>
  <text x="175" y="293" text-anchor="middle" font-size="10" fill="#555">rooms</text>
  <text x="245" y="282" text-anchor="middle" font-size="10" fill="#555">Printing</text>
  <text x="315" y="282" text-anchor="middle" font-size="10" fill="#555">Reading</text>
  <text x="315" y="293" text-anchor="middle" font-size="10" fill="#555">area</text>
  <text x="385" y="282" text-anchor="middle" font-size="10" fill="#555">Group</text>
  <text x="385" y="293" text-anchor="middle" font-size="10" fill="#555">discussion</text>
  <text x="455" y="282" text-anchor="middle" font-size="10" fill="#555">Journals</text>
</svg>`,
    },
    {
      id: "writing-task-2",
      title: "Task 2",
      taskLabel: "Writing Task 2",
      minWords: 250,
      recommendedMinutes: 40,
      instruction: `You should spend about 40 minutes on this task.

Write about the following topic:

Some people believe that university students should be required to attend classes. Others believe that going to classes should be optional for students.

Discuss both these views and give your own opinion.

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.`,
      taskImageSvg: null,
    },
  ],
};

export const MOCK_SPEAKING_DATA = {
  candidateName: "NGUYEN VAN A",
  candidateId: "123456",
  testType: "IELTS Speaking",
  totalMinutes: 15,
  parts: [
    {
      id: "speaking-part-1",
      partNumber: 1,
      title: "Introduction & Interview",
      durationMinutes: 5,
      instructions:
        "In this part, the examiner asks you questions about yourself and familiar topics such as home, family, work, studies and interests.",
      questions: [
        { id: "sp1q1", text: "Can you tell me your full name please?" },
        { id: "sp1q2", text: "Do you work or are you a student?" },
        {
          id: "sp1q3",
          text: "What do you like most about the area where you grew up?",
        },
        {
          id: "sp1q4",
          text: "How do you usually spend your free time in the evenings?",
        },
        {
          id: "sp1q5",
          text: "Do you enjoy listening to music? What kinds of music do you like?",
        },
      ],
    },
    {
      id: "speaking-part-2",
      partNumber: 2,
      title: "Individual Long Turn",
      durationMinutes: 4,
      instructions:
        "You have one minute to prepare. Then speak for one to two minutes on the topic. The examiner may ask one or two questions at the end.",
      questions: [
        {
          id: "sp2q1",
          text: "Describe a time when you helped someone.",
          topic: "Describe a time when you helped someone.",
          instruction: "You should say:",
          bulletPoints: [
            "who you helped and when this happened",
            "what the situation was",
            "what you did to help",
          ],
          closingSentence:
            "and explain how you felt about helping this person.",
        },
        {
          id: "sp2q2",
          text: "Have you helped more people since then?",
        },
      ],
    },
    {
      id: "speaking-part-3",
      partNumber: 3,
      title: "Two-way Discussion",
      durationMinutes: 5,
      instructions:
        "In this part, the examiner asks further questions connected to the topic in Part 2.",
      questions: [
        {
          id: "sp3q1",
          text: "In general, do you think people in your country are helpful to strangers? Why or why not?",
        },
        {
          id: "sp3q2",
          text: "What are some reasons why people might be reluctant to ask others for help?",
        },
        {
          id: "sp3q3",
          text: "How has the sense of community changed in modern cities compared to the past?",
        },
        {
          id: "sp3q4",
          text: "Should governments encourage volunteering? What policies might be effective?",
        },
        {
          id: "sp3q5",
          text: "Do you think social media has made it easier or harder for people to help one another? Why?",
        },
      ],
    },
  ],
};
