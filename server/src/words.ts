export type RoomCategory =
  | "Food"
  | "Festivals"
  | "Places"
  | "Movies"
  | "Farming"
  | "Animals"
  | "Household"
  | "School"
  | "Funny";

export type RoomDifficulty = "Easy" | "Medium" | "Hard";
export type WordLanguage = "Telugu" | "English";

export type TeluguWord = {
  id: string;
  language: WordLanguage;
  displayWord: string;
  answer: string;
  acceptedAnswers: string[];
  category: RoomCategory;
  difficulty: RoomDifficulty;
};

function word(
  displayWord: string,
  answer: string,
  acceptedAnswers: string[],
  category: RoomCategory,
  difficulty: RoomDifficulty
): TeluguWord {
  return {
    id: `telugu_${answer.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
    language: "Telugu",
    displayWord,
    answer,
    acceptedAnswers,
    category,
    difficulty
  };
}

function englishWord(
  displayWord: string,
  answer: string,
  acceptedAnswers: string[],
  category: RoomCategory,
  difficulty: RoomDifficulty
): TeluguWord {
  return {
    id: `english_${answer.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
    language: "English",
    displayWord,
    answer,
    acceptedAnswers,
    category,
    difficulty
  };
}

export const teluguWords: TeluguWord[] = [
  word("పులిహోర", "pulihora", ["pulihora", "pulihara", "puliyora", "puliyodara"], "Food", "Easy"),
  word("దోసె", "dosa", ["dosa", "dose", "dosai"], "Food", "Easy"),
  word("లడ్డూ", "laddu", ["laddu", "laddoo", "ladu"], "Food", "Easy"),
  word("ఇడ్లీ", "idli", ["idli", "idly", "idlee"], "Food", "Easy"),
  word("వడ", "vada", ["vada", "wada", "garelu"], "Food", "Easy"),
  word("పాయసం", "payasam", ["payasam", "paayasam", "kheer"], "Food", "Medium"),
  word("బిర్యానీ", "biryani", ["biryani", "biriyani", "biryanee"], "Food", "Easy"),
  word("గోంగూర", "gongura", ["gongura", "gongura pachadi", "gongura pickle"], "Food", "Medium"),
  word("మామిడికాయ", "mamidikaya", ["mamidikaya", "maamidikaya", "mamidi kaya"], "Food", "Medium"),
  word("పప్పు", "pappu", ["pappu", "dal", "daal"], "Food", "Easy"),
  word("పచ్చడి", "pachadi", ["pachadi", "pacchadi", "chutney"], "Food", "Medium"),
  word("అరిసెలు", "ariselu", ["ariselu", "arisa", "ariselu sweet"], "Food", "Hard"),
  word("బొబ్బట్లు", "bobbatlu", ["bobbatlu", "bobbatlu", "puran poli", "bakshalu"], "Food", "Hard"),
  word("చక్కెర పొంగలి", "chakkera pongali", ["chakkera pongali", "sweet pongal", "chakara pongali"], "Food", "Hard"),
  word("రసం", "rasam", ["rasam", "charu", "chaaru"], "Food", "Easy"),

  word("సంక్రాంతి", "sankranti", ["sankranti", "sankranthi", "sankrathi"], "Festivals", "Easy"),
  word("బతుకమ్మ", "bathukamma", ["bathukamma", "batukamma", "bathukama", "batukama"], "Festivals", "Medium"),
  word("దీపావళి", "deepavali", ["deepavali", "diwali", "deepawali"], "Festivals", "Medium"),
  word("దసరా", "dasara", ["dasara", "dussehra", "dasera"], "Festivals", "Easy"),
  word("ఉగాది", "ugadi", ["ugadi", "yugadi", "ugaadi"], "Festivals", "Easy"),
  word("వినాయక చవితి", "vinayaka chavithi", ["vinayaka chavithi", "ganesh chaturthi", "vinayaka chavithi"], "Festivals", "Hard"),
  word("రాఖీ", "rakhi", ["rakhi", "raksha bandhan", "raakhi"], "Festivals", "Easy"),
  word("హోలీ", "holi", ["holi", "holee"], "Festivals", "Easy"),
  word("క్రిస్మస్", "christmas", ["christmas", "xmas", "krismas"], "Festivals", "Easy"),
  word("రంజాన్", "ramzan", ["ramzan", "ramadan", "ramjaan"], "Festivals", "Medium"),
  word("బోనాలు", "bonalu", ["bonalu", "bonaalu", "bonaloo"], "Festivals", "Medium"),
  word("కార్తీక దీపం", "karthika deepam", ["karthika deepam", "kartika deepam", "karthika deepalu"], "Festivals", "Hard"),
  word("ముక్కోటి ఏకాదశి", "mukkoti ekadashi", ["mukkoti ekadashi", "mukkoti ekadasi", "vaikunta ekadashi"], "Festivals", "Hard"),
  word("శివరాత్రి", "shivaratri", ["shivaratri", "sivaratri", "maha shivaratri"], "Festivals", "Medium"),
  word("పొంగల్", "pongal", ["pongal", "pongali"], "Festivals", "Easy"),

  word("చార్మినార్", "charminar", ["charminar", "chaarminar", "charminaar"], "Places", "Easy"),
  word("గోదావరి", "godavari", ["godavari", "godaavari", "godhavari"], "Places", "Easy"),
  word("కృష్ణా నది", "krishna river", ["krishna river", "krishna nadi", "krishna"], "Places", "Medium"),
  word("తిరుపతి", "tirupati", ["tirupati", "thirupati", "tirupathi"], "Places", "Easy"),
  word("విజయవాడ", "vijayawada", ["vijayawada", "vijaywada", "bejawada"], "Places", "Easy"),
  word("హైదరాబాదు", "hyderabad", ["hyderabad", "haidabad", "hyderbad"], "Places", "Easy"),
  word("విశాఖపట్నం", "visakhapatnam", ["visakhapatnam", "vizag", "vishakhapatnam"], "Places", "Medium"),
  word("అమరావతి", "amaravati", ["amaravati", "amaravathi", "amaravati city"], "Places", "Medium"),
  word("కాకతీయ కోట", "kakatiya fort", ["kakatiya fort", "kakatiya kota", "warangal fort"], "Places", "Hard"),
  word("కొండపల్లి", "kondapalli", ["kondapalli", "kondapally", "kondapalli bommalu"], "Places", "Hard"),
  word("అరకులోయ", "araku valley", ["araku valley", "araku", "arakuloya"], "Places", "Medium"),
  word("హుస్సేన్ సాగర్", "hussain sagar", ["hussain sagar", "hussainsagar", "tank bund"], "Places", "Hard"),
  word("గోల్కొండ", "golconda", ["golconda", "golkonda", "golconda fort"], "Places", "Medium"),
  word("యాదగిరిగుట్ట", "yadagirigutta", ["yadagirigutta", "yadadri", "yadagiri gutta"], "Places", "Hard"),
  word("భద్రాచలం", "bhadrachalam", ["bhadrachalam", "badrachalam", "bhadrachalam temple"], "Places", "Hard"),

  word("సినిమా", "cinema", ["cinema", "sinima", "movie"], "Movies", "Easy"),
  word("హీరో", "hero", ["hero", "heero"], "Movies", "Easy"),
  word("హీరోయిన్", "heroine", ["heroine", "heroin", "heroien"], "Movies", "Easy"),
  word("డైరెక్టర్", "director", ["director", "direktor"], "Movies", "Medium"),
  word("కెమెరా", "camera", ["camera", "kamera"], "Movies", "Easy"),
  word("పాట", "song", ["song", "paata", "pata"], "Movies", "Easy"),
  word("నృత్యం", "dance", ["dance", "nrutyam", "nrityam"], "Movies", "Medium"),
  word("విలన్", "villain", ["villain", "vilan", "villan"], "Movies", "Easy"),
  word("కామెడీ", "comedy", ["comedy", "komedy"], "Movies", "Easy"),
  word("క్లైమాక్స్", "climax", ["climax", "klaimax"], "Movies", "Medium"),
  word("థియేటర్", "theatre", ["theatre", "theater", "theatre hall"], "Movies", "Medium"),
  word("ట్రైలర్", "trailer", ["trailer", "trailar"], "Movies", "Medium"),
  word("రామోజీ ఫిల్మ్ సిటీ", "ramoji film city", ["ramoji film city", "ramoji", "ramoji filmcity"], "Movies", "Hard"),
  word("డబ్బింగ్", "dubbing", ["dubbing", "dubing"], "Movies", "Medium"),
  word("ఇంటర్వెల్", "interval", ["interval", "intervel", "break"], "Movies", "Easy"),

  word("వరి", "vari", ["vari", "paddy", "rice crop"], "Farming", "Easy"),
  word("నాగలి", "nagali", ["nagali", "plough", "plow"], "Farming", "Medium"),
  word("ఎరువు", "eruvu", ["eruvu", "fertilizer", "fertiliser"], "Farming", "Hard"),
  word("పొలం", "polam", ["polam", "field", "farm"], "Farming", "Easy"),
  word("రైతు", "raithu", ["raithu", "rythu", "farmer"], "Farming", "Easy"),
  word("బావి", "bavi", ["bavi", "well", "baavi"], "Farming", "Easy"),
  word("కాలువ", "kaluva", ["kaluva", "canal", "kaaluva"], "Farming", "Medium"),
  word("విత్తనం", "vittanam", ["vittanam", "seed", "vitthanam"], "Farming", "Medium"),
  word("పంట", "panta", ["panta", "crop", "panta"], "Farming", "Easy"),
  word("కోత", "kotha", ["kotha", "harvest", "kota"], "Farming", "Medium"),
  word("ట్రాక్టర్", "tractor", ["tractor", "trakter"], "Farming", "Easy"),
  word("గేదెబండి", "gedebandi", ["gedebandi", "bullock cart", "gedela bandi"], "Farming", "Hard"),
  word("జొన్న", "jonna", ["jonna", "jowar", "sorghum"], "Farming", "Medium"),
  word("మొక్కజొన్న", "mokkajonna", ["mokkajonna", "corn", "maize"], "Farming", "Medium"),
  word("పత్తి", "patti", ["patti", "cotton", "patthi"], "Farming", "Medium"),

  word("కుక్క", "kukka", ["kukka", "dog", "kuka"], "Animals", "Easy"),
  word("పిల్లి", "pilli", ["pilli", "cat", "pili"], "Animals", "Easy"),
  word("ఆవు", "aavu", ["aavu", "avu", "cow"], "Animals", "Easy"),
  word("గేదె", "gede", ["gede", "buffalo", "gedhe"], "Animals", "Medium"),
  word("మేక", "meka", ["meka", "goat"], "Animals", "Easy"),
  word("గుర్రం", "gurram", ["gurram", "horse", "guram"], "Animals", "Easy"),
  word("ఏనుగు", "enugu", ["enugu", "elephant", "yenugu"], "Animals", "Easy"),
  word("సింహం", "simham", ["simham", "lion", "singham"], "Animals", "Medium"),
  word("పులి", "puli", ["puli", "tiger"], "Animals", "Easy"),
  word("కోతి", "kothi", ["kothi", "monkey", "koti"], "Animals", "Easy"),
  word("చిలుక", "chiluka", ["chiluka", "parrot", "chilaka"], "Animals", "Medium"),
  word("కాకి", "kaki", ["kaki", "crow"], "Animals", "Easy"),
  word("నెమలి", "nemali", ["nemali", "peacock"], "Animals", "Medium"),
  word("పాము", "paamu", ["paamu", "pamu", "snake"], "Animals", "Easy"),
  word("చేప", "chepa", ["chepa", "fish"], "Animals", "Easy"),

  word("కుర్చీ", "kurchi", ["kurchi", "chair", "kurchee"], "Household", "Easy"),
  word("బల్ల", "balla", ["balla", "table", "bala"], "Household", "Easy"),
  word("మంచం", "mancham", ["mancham", "bed"], "Household", "Easy"),
  word("తలుపు", "talupu", ["talupu", "door", "thalupu"], "Household", "Easy"),
  word("కిటికీ", "kitiki", ["kitiki", "window", "kitikee"], "Household", "Easy"),
  word("దుప్పటి", "duppati", ["duppati", "blanket", "duppatti"], "Household", "Medium"),
  word("గిన్నె", "ginne", ["ginne", "bowl", "ginni"], "Household", "Easy"),
  word("ప్లేట్", "plate", ["plate", "pletu"], "Household", "Easy"),
  word("చెంచా", "chencha", ["chencha", "spoon", "chenchaa"], "Household", "Medium"),
  word("కప్పు", "kappu", ["kappu", "cup"], "Household", "Easy"),
  word("దీపం", "deepam", ["deepam", "lamp", "diya"], "Household", "Easy"),
  word("అద్దం", "addam", ["addam", "mirror"], "Household", "Medium"),
  word("చీపురు", "cheepuru", ["cheepuru", "broom", "cheepuru katta"], "Household", "Medium"),
  word("బకెట్", "bucket", ["bucket", "baket"], "Household", "Easy"),
  word("తాళం", "thalam", ["thalam", "lock", "talam"], "Household", "Medium"),

  word("పాఠశాల", "pathashala", ["pathashala", "school", "paatashala"], "School", "Medium"),
  word("పుస్తకం", "pustakam", ["pustakam", "book", "pustakamu"], "School", "Easy"),
  word("పెన్సిల్", "pencil", ["pencil", "pensil"], "School", "Easy"),
  word("పెన్", "pen", ["pen"], "School", "Easy"),
  word("బ్యాగ్", "bag", ["bag", "school bag"], "School", "Easy"),
  word("బ్లాక్‌బోర్డ్", "blackboard", ["blackboard", "black board", "board"], "School", "Medium"),
  word("గురువు", "guruvu", ["guruvu", "teacher", "guru"], "School", "Easy"),
  word("విద్యార్థి", "vidyarthi", ["vidyarthi", "student", "vidyardhi"], "School", "Medium"),
  word("హోంవర్క్", "homework", ["homework", "home work"], "School", "Easy"),
  word("పరీక్ష", "pariksha", ["pariksha", "exam", "pareeksha"], "School", "Medium"),
  word("గణితం", "ganitham", ["ganitham", "maths", "math"], "School", "Medium"),
  word("సైన్స్", "science", ["science", "sains"], "School", "Easy"),
  word("మ్యాప్", "map", ["map"], "School", "Easy"),
  word("గంట", "ganta", ["ganta", "bell", "school bell"], "School", "Easy"),
  word("తరగతి", "taragati", ["taragati", "class", "classroom"], "School", "Medium"),

  word("అయ్యో", "ayyo", ["ayyo", "aiyo", "ayyoo"], "Funny", "Easy"),
  word("అబ్బా", "abba", ["abba", "abbah"], "Funny", "Easy"),
  word("బాబోయ్", "baboy", ["baboy", "baboi", "baboyy"], "Funny", "Medium"),
  word("కిర్రాక్", "kirrak", ["kirrak", "kirraak", "kiraak"], "Funny", "Medium"),
  word("జక్కాస్", "jakkas", ["jakkas", "jakas", "jhakaas"], "Funny", "Medium"),
  word("మస్తు", "mast", ["mast", "masthu", "mastu"], "Funny", "Easy"),
  word("సూపర్", "super", ["super", "sooper", "supper"], "Funny", "Easy"),
  word("బిందాస్", "bindas", ["bindas", "bindaas", "bindass"], "Funny", "Medium"),
  word("గోల", "gola", ["gola", "noise", "ruckus"], "Funny", "Easy"),
  word("తిక్క", "tikka", ["tikka", "thikka", "crazy"], "Funny", "Medium"),
  word("జల్సా", "jalsa", ["jalsa", "jalsaa"], "Funny", "Easy"),
  word("లైట్ తీసుకో", "light teesuko", ["light teesuko", "lite teesko", "take it light"], "Funny", "Hard"),
  word("పక్కా", "pakka", ["pakka", "pakkaaa", "sure"], "Funny", "Easy"),
  word("డైలాగ్", "dialogue", ["dialogue", "dialog", "dialogue cheppu"], "Funny", "Medium"),
  word("సీన్ లేదు", "scene ledu", ["scene ledu", "seen ledu", "no scene"], "Funny", "Hard"),

  word("పెరుగు అన్నం", "perugu annam", ["perugu annam", "curd rice", "perugannam"], "Food", "Easy"),
  word("మిరపకాయ బజ్జి", "mirapakaya bajji", ["mirapakaya bajji", "mirchi bajji", "mirapakaya bajji"], "Food", "Medium"),
  word("తెలంగాణ జాతర", "telangana jathara", ["telangana jathara", "telangana jatara", "jathara"], "Festivals", "Medium"),
  word("గంగమ్మ జాతర", "gangamma jathara", ["gangamma jathara", "gangamma jatara", "gangamma"], "Festivals", "Hard"),
  word("నాగార్జునసాగర్", "nagarjuna sagar", ["nagarjuna sagar", "nagarjunasagar", "sagar dam"], "Places", "Hard"),
  word("శ్రీశైలం", "srisailam", ["srisailam", "srisailam temple", "srisailam dam"], "Places", "Medium"),
  word("మాస్ పాట", "mass song", ["mass song", "mass paata", "mass pata"], "Movies", "Easy"),
  word("ఫైట్ సీన్", "fight scene", ["fight scene", "fight seen", "action scene"], "Movies", "Medium"),
  word("మట్టికొడవలి", "matti kodavali", ["matti kodavali", "kodavali", "sickle"], "Farming", "Hard"),
  word("నీటి పంపు", "neeti pumpu", ["neeti pumpu", "water pump", "pump"], "Farming", "Medium"),
  word("ఎద్దు", "eddu", ["eddu", "bull", "ox"], "Animals", "Easy"),
  word("కుందేలు", "kundelu", ["kundelu", "rabbit", "kundeelu"], "Animals", "Medium"),
  word("ఉరుము రోకలి", "rokali", ["rokali", "mortar pestle", "urumu rokali"], "Household", "Hard"),
  word("నోట్‌బుక్", "notebook", ["notebook", "note book", "notes"], "School", "Easy"),
  word("అసలు సిసలు", "asalu sisalu", ["asalu sisalu", "asal sisal", "original"], "Funny", "Hard")
];

export const englishWords: TeluguWord[] = [
  englishWord("Mango", "mango", ["mango"], "Food", "Easy"),
  englishWord("Pizza", "pizza", ["pizza"], "Food", "Easy"),
  englishWord("Biryani", "biryani", ["biryani", "biriyani"], "Food", "Easy"),
  englishWord("Pancake", "pancake", ["pancake", "pan cake"], "Food", "Medium"),
  englishWord("Chocolate", "chocolate", ["chocolate", "choclate"], "Food", "Easy"),
  englishWord("Popcorn", "popcorn", ["popcorn", "pop corn"], "Food", "Easy"),

  englishWord("Christmas", "christmas", ["christmas", "xmas"], "Festivals", "Easy"),
  englishWord("Diwali", "diwali", ["diwali", "deepavali"], "Festivals", "Easy"),
  englishWord("Halloween", "halloween", ["halloween", "hallowen"], "Festivals", "Medium"),
  englishWord("New Year", "new year", ["new year", "newyear"], "Festivals", "Easy"),
  englishWord("Birthday", "birthday", ["birthday", "birth day"], "Festivals", "Easy"),
  englishWord("Thanksgiving", "thanksgiving", ["thanksgiving", "thanks giving"], "Festivals", "Hard"),

  englishWord("Beach", "beach", ["beach"], "Places", "Easy"),
  englishWord("Museum", "museum", ["museum"], "Places", "Medium"),
  englishWord("Airport", "airport", ["airport", "air port"], "Places", "Easy"),
  englishWord("Library", "library", ["library", "libary"], "Places", "Medium"),
  englishWord("Mountain", "mountain", ["mountain", "mountains"], "Places", "Easy"),
  englishWord("Stadium", "stadium", ["stadium"], "Places", "Medium"),

  englishWord("Camera", "camera", ["camera"], "Movies", "Easy"),
  englishWord("Director", "director", ["director"], "Movies", "Medium"),
  englishWord("Superhero", "superhero", ["superhero", "super hero"], "Movies", "Easy"),
  englishWord("Villain", "villain", ["villain", "villan"], "Movies", "Easy"),
  englishWord("Climax", "climax", ["climax"], "Movies", "Medium"),
  englishWord("Spaceship", "spaceship", ["spaceship", "space ship"], "Movies", "Hard"),

  englishWord("Farmer", "farmer", ["farmer"], "Farming", "Easy"),
  englishWord("Tractor", "tractor", ["tractor"], "Farming", "Easy"),
  englishWord("Harvest", "harvest", ["harvest"], "Farming", "Medium"),
  englishWord("Seed", "seed", ["seed", "seeds"], "Farming", "Easy"),
  englishWord("Scarecrow", "scarecrow", ["scarecrow", "scare crow"], "Farming", "Hard"),
  englishWord("Irrigation", "irrigation", ["irrigation"], "Farming", "Hard"),

  englishWord("Dog", "dog", ["dog"], "Animals", "Easy"),
  englishWord("Elephant", "elephant", ["elephant", "elefant"], "Animals", "Easy"),
  englishWord("Penguin", "penguin", ["penguin"], "Animals", "Medium"),
  englishWord("Giraffe", "giraffe", ["giraffe", "girafe"], "Animals", "Medium"),
  englishWord("Dinosaur", "dinosaur", ["dinosaur", "dino"], "Animals", "Hard"),
  englishWord("Butterfly", "butterfly", ["butterfly", "butter fly"], "Animals", "Medium"),

  englishWord("Chair", "chair", ["chair"], "Household", "Easy"),
  englishWord("Mirror", "mirror", ["mirror"], "Household", "Easy"),
  englishWord("Blanket", "blanket", ["blanket"], "Household", "Easy"),
  englishWord("Toothbrush", "toothbrush", ["toothbrush", "tooth brush"], "Household", "Medium"),
  englishWord("Microwave", "microwave", ["microwave", "micro wave"], "Household", "Hard"),
  englishWord("Umbrella", "umbrella", ["umbrella", "umbrellla"], "Household", "Medium"),

  englishWord("Book", "book", ["book"], "School", "Easy"),
  englishWord("Pencil", "pencil", ["pencil"], "School", "Easy"),
  englishWord("Teacher", "teacher", ["teacher"], "School", "Easy"),
  englishWord("Homework", "homework", ["homework", "home work"], "School", "Easy"),
  englishWord("Calculator", "calculator", ["calculator"], "School", "Medium"),
  englishWord("Microscope", "microscope", ["microscope", "micro scope"], "School", "Hard"),

  englishWord("Oops", "oops", ["oops", "opps"], "Funny", "Easy"),
  englishWord("Silly", "silly", ["silly"], "Funny", "Easy"),
  englishWord("Meme", "meme", ["meme", "meem"], "Funny", "Easy"),
  englishWord("Awkward", "awkward", ["awkward", "akward"], "Funny", "Medium"),
  englishWord("Facepalm", "facepalm", ["facepalm", "face palm"], "Funny", "Medium"),
  englishWord("Nonsense", "nonsense", ["nonsense", "non sense"], "Funny", "Medium")
];

export const wordBank: TeluguWord[] = [...teluguWords, ...englishWords];
