export type RoomCategory =
  | "Food"
  | "Festivals"
  | "Places"
  | "Movies"
  | "Farming"
  | "Animals"
  | "Household"
  | "School"
  | "Nature"
  | "Funny";

export type RoomDifficulty = "Easy" | "Medium" | "Hard";
export type WordDifficulty = "easy" | "medium" | "hard";
export type WordLanguage = "Telugu" | "English";
export type WordDataLanguage = "telugu" | "english";

export type TeluguWord = {
  id: string;
  language: WordDataLanguage;
  displayWord: string;
  answer: string;
  acceptedAnswers: string[];
  category: RoomCategory;
  difficulty: WordDifficulty;
};

type WordTuple = [
  displayWord: string,
  answer: string,
  acceptedAnswers: string[],
  category: RoomCategory,
  difficulty: WordDifficulty
];

type GetWordsOptions = {
  language: WordLanguage | WordDataLanguage;
  category?: RoomCategory | "All";
  difficulty?: RoomDifficulty | WordDifficulty | "Mixed";
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function normalizeLanguage(language: WordLanguage | WordDataLanguage): WordDataLanguage {
  return language.toLowerCase() as WordDataLanguage;
}

function normalizeDifficulty(difficulty: RoomDifficulty | WordDifficulty | "Mixed" | undefined) {
  return difficulty && difficulty !== "Mixed" ? (difficulty.toLowerCase() as WordDifficulty) : "Mixed";
}

function makeWord(language: WordDataLanguage, tuple: WordTuple): TeluguWord {
  const [displayWord, answer, acceptedAnswers, category, difficulty] = tuple;
  const normalizedAnswer = answer.toLowerCase();
  const normalizedAcceptedAnswers = Array.from(
    new Set([normalizedAnswer, ...acceptedAnswers.map((acceptedAnswer) => acceptedAnswer.toLowerCase())])
  );

  return {
    id: `${language}_${slug(normalizedAnswer)}`,
    language,
    displayWord,
    answer: normalizedAnswer,
    acceptedAnswers: normalizedAcceptedAnswers,
    category,
    difficulty
  };
}

const teluguWordTuples: WordTuple[] = [
  ["పులిహోర", "pulihora", ["pulihara", "puliyora", "puliyodara"], "Food", "easy"],
  ["దోసె", "dosa", ["dose", "dosai"], "Food", "easy"],
  ["లడ్డూ", "laddu", ["laddoo", "ladu"], "Food", "easy"],
  ["ఇడ్లీ", "idli", ["idly", "idlee"], "Food", "easy"],
  ["వడ", "vada", ["wada", "garelu"], "Food", "easy"],
  ["పాయసం", "payasam", ["paayasam", "kheer"], "Food", "medium"],
  ["బిర్యానీ", "biryani", ["biriyani", "biryanee"], "Food", "easy"],
  ["గోంగూర", "gongura", ["gongura pachadi", "gongura pickle"], "Food", "medium"],
  ["మామిడికాయ", "mamidikaya", ["maamidikaya", "mamidi kaya"], "Food", "medium"],
  ["పప్పు", "pappu", ["dal", "daal"], "Food", "easy"],
  ["పచ్చడి", "pachadi", ["pacchadi", "chutney"], "Food", "medium"],
  ["అరిసెలు", "ariselu", ["arisa", "ariselu sweet"], "Food", "hard"],
  ["బొబ్బట్లు", "bobbatlu", ["bobbatlu sweet", "puran poli", "bakshalu"], "Food", "hard"],
  ["చక్కెర పొంగలి", "chakkera pongali", ["sweet pongal", "chakara pongali"], "Food", "hard"],
  ["రసం", "rasam", ["charu", "chaaru"], "Food", "easy"],
  ["పెరుగు అన్నం", "perugu annam", ["curd rice", "perugannam"], "Food", "easy"],
  ["మిరపకాయ బజ్జి", "mirapakaya bajji", ["mirchi bajji", "mirapakaya bajji"], "Food", "medium"],

  ["సంక్రాంతి", "sankranti", ["sankranthi", "sankrathi"], "Festivals", "easy"],
  ["బతుకమ్మ", "bathukamma", ["batukamma", "bathukama", "batukama"], "Festivals", "medium"],
  ["దీపావళి", "deepavali", ["diwali", "deepawali"], "Festivals", "medium"],
  ["దసరా", "dasara", ["dussehra", "dasera"], "Festivals", "easy"],
  ["ఉగాది", "ugadi", ["yugadi", "ugaadi"], "Festivals", "easy"],
  ["వినాయక చవితి", "vinayaka chavithi", ["ganesh chaturthi", "vinayaka chaviti"], "Festivals", "hard"],
  ["రాఖీ", "rakhi", ["raksha bandhan", "raakhi"], "Festivals", "easy"],
  ["హోలీ", "holi", ["holee"], "Festivals", "easy"],
  ["క్రిస్మస్", "christmas", ["xmas", "krismas"], "Festivals", "easy"],
  ["రంజాన్", "ramzan", ["ramadan", "ramjaan"], "Festivals", "medium"],
  ["బోనాలు", "bonalu", ["bonaalu", "bonaloo"], "Festivals", "medium"],
  ["కార్తీక దీపం", "karthika deepam", ["kartika deepam", "karthika deepalu"], "Festivals", "hard"],
  ["ముక్కోటి ఏకాదశి", "mukkoti ekadashi", ["mukkoti ekadasi", "vaikunta ekadashi"], "Festivals", "hard"],
  ["శివరాత్రి", "shivaratri", ["sivaratri", "maha shivaratri"], "Festivals", "medium"],
  ["పొంగల్", "pongal", ["pongali"], "Festivals", "easy"],
  ["తెలంగాణ జాతర", "telangana jathara", ["telangana jatara", "jathara"], "Festivals", "medium"],
  ["గంగమ్మ జాతర", "gangamma jathara", ["gangamma jatara", "gangamma"], "Festivals", "hard"],

  ["చార్మినార్", "charminar", ["chaarminar", "charminaar"], "Places", "easy"],
  ["గోదావరి", "godavari", ["godaavari", "godhavari"], "Places", "easy"],
  ["కృష్ణా నది", "krishna river", ["krishna nadi", "krishna"], "Places", "medium"],
  ["తిరుపతి", "tirupati", ["thirupati", "tirupathi"], "Places", "easy"],
  ["విజయవాడ", "vijayawada", ["vijaywada", "bejawada"], "Places", "easy"],
  ["హైదరాబాదు", "hyderabad", ["haidabad", "hyderbad"], "Places", "easy"],
  ["విశాఖపట్నం", "visakhapatnam", ["vizag", "vishakhapatnam"], "Places", "medium"],
  ["అమరావతి", "amaravati", ["amaravathi", "amaravati city"], "Places", "medium"],
  ["కాకతీయ కోట", "kakatiya fort", ["kakatiya kota", "warangal fort"], "Places", "hard"],
  ["కొండపల్లి", "kondapalli", ["kondapally", "kondapalli bommalu"], "Places", "hard"],
  ["అరకులోయ", "araku valley", ["araku", "arakuloya"], "Places", "medium"],
  ["హుస్సేన్ సాగర్", "hussain sagar", ["hussainsagar", "tank bund"], "Places", "hard"],
  ["గోల్కొండ", "golconda", ["golkonda", "golconda fort"], "Places", "medium"],
  ["యాదగిరిగుట్ట", "yadagirigutta", ["yadadri", "yadagiri gutta"], "Places", "hard"],
  ["భద్రాచలం", "bhadrachalam", ["badrachalam", "bhadrachalam temple"], "Places", "hard"],
  ["నాగార్జునసాగర్", "nagarjuna sagar", ["nagarjunasagar", "sagar dam"], "Places", "hard"],
  ["శ్రీశైలం", "srisailam", ["srisailam temple", "srisailam dam"], "Places", "medium"],

  ["సినిమా", "cinema", ["sinima", "movie"], "Movies", "easy"],
  ["హీరో", "hero", ["heero"], "Movies", "easy"],
  ["హీరోయిన్", "heroine", ["heroin", "heroien"], "Movies", "easy"],
  ["డైరెక్టర్", "director", ["direktor"], "Movies", "medium"],
  ["కెమెరా", "camera", ["kamera"], "Movies", "easy"],
  ["పాట", "song", ["paata", "pata"], "Movies", "easy"],
  ["నృత్యం", "dance", ["nrutyam", "nrityam"], "Movies", "medium"],
  ["విలన్", "villain", ["vilan", "villan"], "Movies", "easy"],
  ["కామెడీ", "comedy", ["komedy"], "Movies", "easy"],
  ["క్లైమాక్స్", "climax", ["klaimax"], "Movies", "medium"],
  ["థియేటర్", "theatre", ["theater", "theatre hall"], "Movies", "medium"],
  ["ట్రైలర్", "trailer", ["trailar"], "Movies", "medium"],
  ["రామోజీ ఫిల్మ్ సిటీ", "ramoji film city", ["ramoji", "ramoji filmcity"], "Movies", "hard"],
  ["డబ్బింగ్", "dubbing", ["dubing"], "Movies", "medium"],
  ["ఇంటర్వెల్", "interval", ["intervel", "break"], "Movies", "easy"],
  ["మాస్ పాట", "mass song", ["mass paata", "mass pata"], "Movies", "easy"],
  ["ఫైట్ సీన్", "fight scene", ["fight seen", "action scene"], "Movies", "medium"],

  ["వరి", "vari", ["paddy", "rice crop"], "Farming", "easy"],
  ["నాగలి", "nagali", ["plough", "plow"], "Farming", "medium"],
  ["ఎరువు", "eruvu", ["fertilizer", "fertiliser"], "Farming", "hard"],
  ["పొలం", "polam", ["field", "farm"], "Farming", "easy"],
  ["రైతు", "raithu", ["rythu", "farmer"], "Farming", "easy"],
  ["బావి", "bavi", ["well", "baavi"], "Farming", "easy"],
  ["కాలువ", "kaluva", ["canal", "kaaluva"], "Farming", "medium"],
  ["విత్తనం", "vittanam", ["seed", "vitthanam"], "Farming", "medium"],
  ["పంట", "panta", ["crop"], "Farming", "easy"],
  ["కోత", "kotha", ["harvest", "kota"], "Farming", "medium"],
  ["ట్రాక్టర్", "tractor", ["trakter"], "Farming", "easy"],
  ["గేదెబండి", "gedebandi", ["bullock cart", "gedela bandi"], "Farming", "hard"],
  ["జొన్న", "jonna", ["jowar", "sorghum"], "Farming", "medium"],
  ["మొక్కజొన్న", "mokkajonna", ["corn", "maize"], "Farming", "medium"],
  ["పత్తి", "patti", ["cotton", "patthi"], "Farming", "medium"],
  ["మట్టికొడవలి", "matti kodavali", ["kodavali", "sickle"], "Farming", "hard"],
  ["నీటి పంపు", "neeti pumpu", ["water pump", "pump"], "Farming", "medium"],

  ["కుక్క", "kukka", ["dog", "kuka"], "Animals", "easy"],
  ["పిల్లి", "pilli", ["cat", "pili"], "Animals", "easy"],
  ["ఆవు", "aavu", ["avu", "cow"], "Animals", "easy"],
  ["గేదె", "gede", ["buffalo", "gedhe"], "Animals", "medium"],
  ["మేక", "meka", ["goat"], "Animals", "easy"],
  ["గుర్రం", "gurram", ["horse", "guram"], "Animals", "easy"],
  ["ఏనుగు", "enugu", ["elephant", "yenugu"], "Animals", "easy"],
  ["సింహం", "simham", ["lion", "singham"], "Animals", "medium"],
  ["పులి", "puli", ["tiger"], "Animals", "easy"],
  ["కోతి", "kothi", ["monkey", "koti"], "Animals", "easy"],
  ["చిలుక", "chiluka", ["parrot", "chilaka"], "Animals", "medium"],
  ["కాకి", "kaki", ["crow"], "Animals", "easy"],
  ["నెమలి", "nemali", ["peacock"], "Animals", "medium"],
  ["పాము", "paamu", ["pamu", "snake"], "Animals", "easy"],
  ["చేప", "chepa", ["fish"], "Animals", "easy"],
  ["ఎద్దు", "eddu", ["bull", "ox"], "Animals", "easy"],
  ["కుందేలు", "kundelu", ["rabbit", "kundeelu"], "Animals", "medium"],

  ["కుర్చీ", "kurchi", ["chair", "kurchee"], "Household", "easy"],
  ["బల్ల", "balla", ["table", "bala"], "Household", "easy"],
  ["మంచం", "mancham", ["bed"], "Household", "easy"],
  ["తలుపు", "talupu", ["door", "thalupu"], "Household", "easy"],
  ["కిటికీ", "kitiki", ["window", "kitikee"], "Household", "easy"],
  ["దుప్పటి", "duppati", ["blanket", "duppatti"], "Household", "medium"],
  ["గిన్నె", "ginne", ["bowl", "ginni"], "Household", "easy"],
  ["ప్లేట్", "plate", ["pletu"], "Household", "easy"],
  ["చెంచా", "chencha", ["spoon", "chenchaa"], "Household", "medium"],
  ["కప్పు", "kappu", ["cup"], "Household", "easy"],
  ["దీపం", "deepam", ["lamp", "diya"], "Household", "easy"],
  ["అద్దం", "addam", ["mirror"], "Household", "medium"],
  ["చీపురు", "cheepuru", ["broom", "cheepuru katta"], "Household", "medium"],
  ["బకెట్", "bucket", ["baket"], "Household", "easy"],
  ["తాళం", "thalam", ["lock", "talam"], "Household", "medium"],
  ["ఉరుము రోకలి", "rokali", ["mortar pestle", "urumu rokali"], "Household", "hard"],

  ["పాఠశాల", "pathashala", ["school", "paatashala"], "School", "medium"],
  ["పుస్తకం", "pustakam", ["book", "pustakamu"], "School", "easy"],
  ["పెన్సిల్", "pencil", ["pensil"], "School", "easy"],
  ["పెన్", "pen", ["pen"], "School", "easy"],
  ["బ్యాగ్", "bag", ["school bag"], "School", "easy"],
  ["బ్లాక్‌బోర్డ్", "blackboard", ["black board", "board"], "School", "medium"],
  ["గురువు", "guruvu", ["teacher", "guru"], "School", "easy"],
  ["విద్యార్థి", "vidyarthi", ["student", "vidyardhi"], "School", "medium"],
  ["హోంవర్క్", "homework", ["home work"], "School", "easy"],
  ["పరీక్ష", "pariksha", ["exam", "pareeksha"], "School", "medium"],
  ["గణితం", "ganitham", ["maths", "math"], "School", "medium"],
  ["సైన్స్", "science", ["sains"], "School", "easy"],
  ["మ్యాప్", "map", ["map"], "School", "easy"],
  ["గంట", "ganta", ["bell", "school bell"], "School", "easy"],
  ["తరగతి", "taragati", ["class", "classroom"], "School", "medium"],
  ["నోట్‌బుక్", "notebook", ["note book", "notes"], "School", "easy"],

  ["వాన", "vaana", ["vana", "rain"], "Nature", "easy"],
  ["మేఘం", "megham", ["cloud", "megam"], "Nature", "easy"],
  ["చంద్రుడు", "chandrudu", ["moon", "chandrud"], "Nature", "medium"],
  ["సూర్యుడు", "suryudu", ["sun", "sooryudu"], "Nature", "medium"],
  ["నక్షత్రం", "nakshatram", ["star", "nakshatramu"], "Nature", "medium"],
  ["సముద్రం", "samudram", ["sea", "ocean"], "Nature", "medium"],
  ["పర్వతం", "parvatham", ["mountain", "parvatam"], "Nature", "medium"],
  ["చెట్టు", "chettu", ["tree", "chetu"], "Nature", "easy"],
  ["పువ్వు", "puvvu", ["flower", "poovu"], "Nature", "easy"],
  ["ఆకు", "aaku", ["leaf", "aku"], "Nature", "easy"],
  ["ఇంద్రధనుస్సు", "indradhanussu", ["rainbow", "indradhanusu"], "Nature", "hard"],
  ["మెరుపు", "merupu", ["lightning", "merpu"], "Nature", "medium"],
  ["గాలి", "gaali", ["wind", "gali"], "Nature", "easy"],
  ["నది", "nadi", ["river"], "Nature", "easy"],
  ["అడవి", "adavi", ["forest"], "Nature", "medium"],

  ["అయ్యో", "ayyo", ["aiyo", "ayyoo"], "Funny", "easy"],
  ["అబ్బా", "abba", ["abbah"], "Funny", "easy"],
  ["బాబోయ్", "baboy", ["baboi", "baboyy"], "Funny", "medium"],
  ["కిర్రాక్", "kirrak", ["kirraak", "kiraak"], "Funny", "medium"],
  ["జక్కాస్", "jakkas", ["jakas", "jhakaas"], "Funny", "medium"],
  ["మస్తు", "mast", ["masthu", "mastu"], "Funny", "easy"],
  ["సూపర్", "super", ["sooper", "supper"], "Funny", "easy"],
  ["బిందాస్", "bindas", ["bindaas", "bindass"], "Funny", "medium"],
  ["గోల", "gola", ["noise", "ruckus"], "Funny", "easy"],
  ["తిక్క", "tikka", ["thikka", "crazy"], "Funny", "medium"],
  ["జల్సా", "jalsa", ["jalsaa"], "Funny", "easy"],
  ["లైట్ తీసుకో", "light teesuko", ["lite teesko", "take it light"], "Funny", "hard"],
  ["పక్కా", "pakka", ["pakkaaa", "sure"], "Funny", "easy"],
  ["డైలాగ్", "dialogue", ["dialog", "dialogue cheppu"], "Funny", "medium"],
  ["సీన్ లేదు", "scene ledu", ["seen ledu", "no scene"], "Funny", "hard"],
  ["అసలు సిసలు", "asalu sisalu", ["asal sisal", "original"], "Funny", "hard"]
];

const englishWordTuples: WordTuple[] = [
  ["Mango", "mango", ["mangos"], "Food", "easy"],
  ["Pizza", "pizza", ["piza"], "Food", "easy"],
  ["Biryani", "biryani", ["biriyani"], "Food", "easy"],
  ["Pancake", "pancake", ["pan cake"], "Food", "medium"],
  ["Chocolate", "chocolate", ["choclate"], "Food", "easy"],
  ["Popcorn", "popcorn", ["pop corn"], "Food", "easy"],
  ["Sandwich", "sandwich", ["sandwitch"], "Food", "easy"],
  ["Noodles", "noodles", ["noodle"], "Food", "easy"],
  ["Ice Cream", "ice cream", ["icecream"], "Food", "easy"],
  ["Burger", "burger", ["hamburger"], "Food", "easy"],
  ["Pineapple", "pineapple", ["pine apple"], "Food", "medium"],
  ["Spaghetti", "spaghetti", ["spagetti"], "Food", "medium"],
  ["Croissant", "croissant", ["crosant"], "Food", "hard"],
  ["Guacamole", "guacamole", ["guac"], "Food", "hard"],
  ["Sushi", "sushi", ["susi"], "Food", "medium"],

  ["Christmas", "christmas", ["xmas"], "Festivals", "easy"],
  ["Diwali", "diwali", ["deepavali"], "Festivals", "easy"],
  ["Halloween", "halloween", ["hallowen"], "Festivals", "medium"],
  ["New Year", "new year", ["newyear"], "Festivals", "easy"],
  ["Birthday", "birthday", ["birth day"], "Festivals", "easy"],
  ["Thanksgiving", "thanksgiving", ["thanks giving"], "Festivals", "hard"],
  ["Easter", "easter", ["easter day"], "Festivals", "easy"],
  ["Carnival", "carnival", ["carnaval"], "Festivals", "medium"],
  ["Hanukkah", "hanukkah", ["chanukah"], "Festivals", "hard"],
  ["Eid", "eid", ["eed"], "Festivals", "easy"],
  ["Lantern Festival", "lantern festival", ["lantern fest"], "Festivals", "hard"],
  ["Oktoberfest", "oktoberfest", ["octoberfest"], "Festivals", "hard"],
  ["Holi", "holi", ["holee"], "Festivals", "easy"],
  ["Mardi Gras", "mardi gras", ["mardigras"], "Festivals", "hard"],
  ["Harvest Festival", "harvest festival", ["harvest fest"], "Festivals", "medium"],

  ["Beach", "beach", ["beech"], "Places", "easy"],
  ["Museum", "museum", ["musem"], "Places", "medium"],
  ["Airport", "airport", ["air port"], "Places", "easy"],
  ["Library", "library", ["libary"], "Places", "medium"],
  ["Mountain", "mountain", ["mountains"], "Places", "easy"],
  ["Stadium", "stadium", ["stadium arena"], "Places", "medium"],
  ["Hospital", "hospital", ["hospitol"], "Places", "easy"],
  ["Restaurant", "restaurant", ["restraunt"], "Places", "medium"],
  ["Playground", "playground", ["play ground"], "Places", "easy"],
  ["Castle", "castle", ["castel"], "Places", "medium"],
  ["Skyscraper", "skyscraper", ["sky scraper"], "Places", "hard"],
  ["Lighthouse", "lighthouse", ["light house"], "Places", "medium"],
  ["Aquarium", "aquarium", ["aquerium"], "Places", "hard"],
  ["Subway Station", "subway station", ["subway"], "Places", "medium"],
  ["Desert Oasis", "desert oasis", ["oasis"], "Places", "hard"],

  ["Camera", "camera", ["camara"], "Movies", "easy"],
  ["Director", "director", ["direktor"], "Movies", "medium"],
  ["Superhero", "superhero", ["super hero"], "Movies", "easy"],
  ["Villain", "villain", ["villan"], "Movies", "easy"],
  ["Climax", "climax", ["final scene"], "Movies", "medium"],
  ["Spaceship", "spaceship", ["space ship"], "Movies", "hard"],
  ["Actor", "actor", ["movie actor"], "Movies", "easy"],
  ["Actress", "actress", ["movie actress"], "Movies", "easy"],
  ["Script", "script", ["screenplay"], "Movies", "medium"],
  ["Trailer", "trailer", ["preview"], "Movies", "medium"],
  ["Popcorn Bucket", "popcorn bucket", ["popcorn tub"], "Movies", "medium"],
  ["Red Carpet", "red carpet", ["redcarpet"], "Movies", "medium"],
  ["Film Reel", "film reel", ["filmreel"], "Movies", "hard"],
  ["Stunt Double", "stunt double", ["stuntman"], "Movies", "hard"],
  ["Soundtrack", "soundtrack", ["sound track"], "Movies", "medium"],

  ["Farmer", "farmer", ["farm worker"], "Farming", "easy"],
  ["Tractor", "tractor", ["trakter"], "Farming", "easy"],
  ["Harvest", "harvest", ["harvesting"], "Farming", "medium"],
  ["Seed", "seed", ["seeds"], "Farming", "easy"],
  ["Scarecrow", "scarecrow", ["scare crow"], "Farming", "hard"],
  ["Irrigation", "irrigation", ["watering system"], "Farming", "hard"],
  ["Barn", "barn", ["farm barn"], "Farming", "easy"],
  ["Cow Shed", "cow shed", ["cowshed"], "Farming", "easy"],
  ["Greenhouse", "greenhouse", ["green house"], "Farming", "medium"],
  ["Plough", "plough", ["plow"], "Farming", "medium"],
  ["Compost", "compost", ["fertilizer"], "Farming", "medium"],
  ["Orchard", "orchard", ["fruit farm"], "Farming", "hard"],
  ["Haystack", "haystack", ["hay stack"], "Farming", "medium"],
  ["Sprinkler", "sprinkler", ["water sprinkler"], "Farming", "medium"],
  ["Silo", "silo", ["grain silo"], "Farming", "hard"],

  ["Dog", "dog", ["puppy"], "Animals", "easy"],
  ["Elephant", "elephant", ["elefant"], "Animals", "easy"],
  ["Penguin", "penguin", ["pengwin"], "Animals", "medium"],
  ["Giraffe", "giraffe", ["girafe"], "Animals", "medium"],
  ["Dinosaur", "dinosaur", ["dino"], "Animals", "hard"],
  ["Butterfly", "butterfly", ["butter fly"], "Animals", "medium"],
  ["Tiger", "tiger", ["tigr"], "Animals", "easy"],
  ["Rabbit", "rabbit", ["bunny"], "Animals", "easy"],
  ["Kangaroo", "kangaroo", ["kangroo"], "Animals", "medium"],
  ["Octopus", "octopus", ["octapus"], "Animals", "hard"],
  ["Dolphin", "dolphin", ["dolfin"], "Animals", "medium"],
  ["Crocodile", "crocodile", ["croc"], "Animals", "hard"],
  ["Peacock", "peacock", ["pea cock"], "Animals", "medium"],
  ["Squirrel", "squirrel", ["squirel"], "Animals", "medium"],
  ["Chameleon", "chameleon", ["came leon"], "Animals", "hard"],

  ["Chair", "chair", ["seat"], "Household", "easy"],
  ["Mirror", "mirror", ["miror"], "Household", "easy"],
  ["Blanket", "blanket", ["blankit"], "Household", "easy"],
  ["Toothbrush", "toothbrush", ["tooth brush"], "Household", "medium"],
  ["Microwave", "microwave", ["micro wave"], "Household", "hard"],
  ["Umbrella", "umbrella", ["umbrellla"], "Household", "medium"],
  ["Sofa", "sofa", ["couch"], "Household", "easy"],
  ["Pillow", "pillow", ["pillowcase"], "Household", "easy"],
  ["Curtain", "curtain", ["curtains"], "Household", "medium"],
  ["Doormat", "doormat", ["door mat"], "Household", "easy"],
  ["Bookshelf", "bookshelf", ["book shelf"], "Household", "medium"],
  ["Refrigerator", "refrigerator", ["fridge"], "Household", "hard"],
  ["Dishwasher", "dishwasher", ["dish washer"], "Household", "hard"],
  ["Ceiling Fan", "ceiling fan", ["fan"], "Household", "medium"],
  ["Laundry Basket", "laundry basket", ["clothes basket"], "Household", "hard"],

  ["Book", "book", ["textbook"], "School", "easy"],
  ["Pencil", "pencil", ["pensil"], "School", "easy"],
  ["Teacher", "teacher", ["school teacher"], "School", "easy"],
  ["Homework", "homework", ["home work"], "School", "easy"],
  ["Calculator", "calculator", ["calc"], "School", "medium"],
  ["Microscope", "microscope", ["micro scope"], "School", "hard"],
  ["Backpack", "backpack", ["school bag"], "School", "easy"],
  ["Notebook", "notebook", ["note book"], "School", "easy"],
  ["Blackboard", "blackboard", ["black board"], "School", "medium"],
  ["Report Card", "report card", ["marks card"], "School", "medium"],
  ["Geography", "geography", ["geo"], "School", "hard"],
  ["Chemistry", "chemistry", ["chem"], "School", "hard"],
  ["Classroom", "classroom", ["class room"], "School", "easy"],
  ["School Bus", "school bus", ["bus"], "School", "easy"],
  ["Graduation Cap", "graduation cap", ["grad cap"], "School", "hard"],

  ["Rain", "rain", ["rainfall"], "Nature", "easy"],
  ["Cloud", "cloud", ["clouds"], "Nature", "easy"],
  ["Sunflower", "sunflower", ["sun flower"], "Nature", "easy"],
  ["Rainbow", "rainbow", ["rain bow"], "Nature", "medium"],
  ["Volcano", "volcano", ["vulcano"], "Nature", "hard"],
  ["Waterfall", "waterfall", ["water fall"], "Nature", "medium"],
  ["Forest", "forest", ["woods"], "Nature", "easy"],
  ["River", "river", ["stream"], "Nature", "easy"],
  ["Thunderstorm", "thunderstorm", ["thunder storm"], "Nature", "hard"],
  ["Snowflake", "snowflake", ["snow flake"], "Nature", "medium"],
  ["Cactus", "cactus", ["cacti"], "Nature", "medium"],
  ["Island", "island", ["isle"], "Nature", "medium"],
  ["Cave", "cave", ["cavern"], "Nature", "easy"],
  ["Coral Reef", "coral reef", ["reef"], "Nature", "hard"],
  ["Meteor", "meteor", ["shooting star"], "Nature", "hard"],

  ["Oops", "oops", ["opps"], "Funny", "easy"],
  ["Silly", "silly", ["goofy"], "Funny", "easy"],
  ["Meme", "meme", ["meem"], "Funny", "easy"],
  ["Awkward", "awkward", ["akward"], "Funny", "medium"],
  ["Facepalm", "facepalm", ["face palm"], "Funny", "medium"],
  ["Nonsense", "nonsense", ["non sense"], "Funny", "medium"],
  ["Giggle", "giggle", ["giggles"], "Funny", "easy"],
  ["Prank", "prank", ["pranks"], "Funny", "easy"],
  ["Banana Peel", "banana peel", ["banana skin"], "Funny", "medium"],
  ["Clown Shoes", "clown shoes", ["clown shoe"], "Funny", "medium"],
  ["Dad Joke", "dad joke", ["dadjoke"], "Funny", "medium"],
  ["Tickle Fight", "tickle fight", ["tickle"], "Funny", "hard"],
  ["Rubber Chicken", "rubber chicken", ["rubberchicken"], "Funny", "hard"],
  ["Sneeze Attack", "sneeze attack", ["sneezing"], "Funny", "hard"],
  ["Brain Freeze", "brain freeze", ["ice cream headache"], "Funny", "hard"]
];

export const teluguWords: TeluguWord[] = teluguWordTuples.map((tuple) => makeWord("telugu", tuple));
export const englishWords: TeluguWord[] = englishWordTuples.map((tuple) => makeWord("english", tuple));
export const wordBank: TeluguWord[] = [...teluguWords, ...englishWords];

export function getWords({ language, category = "All", difficulty = "Mixed" }: GetWordsOptions) {
  const normalizedLanguage = normalizeLanguage(language);
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const languageWords = wordBank.filter((word) => word.language === normalizedLanguage);
  const matchingWords = languageWords.filter((word) => {
    const categoryMatches = category === "All" || word.category === category;
    const difficultyMatches = normalizedDifficulty === "Mixed" || word.difficulty === normalizedDifficulty;
    return categoryMatches && difficultyMatches;
  });

  return matchingWords.length > 0 ? matchingWords : languageWords;
}
