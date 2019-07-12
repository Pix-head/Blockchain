const crypto = require("crypto");
const fs = require("fs");


const DIRNAME = "./Blockchain/"; 


const checkArgs = () => {

	let action = process.argv[2];

	switch(action) {
		case "-w": 
			writeBlock();
			break;
		case "-r":
			readBlocks();
			break;
		case "-a":
			showBlocks();
			break;
		default:
			writeError("Wrong argument!");
			break;
	}

}

const showBlocks = () => {

	if (!fs.existsSync(DIRNAME)) {
		writeError("Blocks not found")

		return;
	}

	if (!fs.existsSync(DIRNAME + "0.json")) {
		writeError("Genesis block not found")
	}

	let lastBlock = getLastBlock();

	if (lastBlock < 1) {
		writeError("Blocks not found")

		return;
	}

	console.log("-----------------------------");

	for (let i=1; i<=lastBlock; i++) {
		let filename = i.toString() + ".json";

		if (!fs.existsSync(DIRNAME + filename)) {
			console.log("BLOCK: #" + i.toString());
			console.log("Not found. Probably it was corrupted.\nRun -r flag to check.")
			console.log("-----------------------------");
		} else {
			printBlock(i);
		}
	}

}

const printBlock = (index) => {

	let filename = index.toString() + ".json";
	let content = fs.readFileSync(DIRNAME + filename, "utf-8");
	let blockContent = JSON.parse(content);

	console.log("BLOCK: #" + index.toString());
	console.log("DATE : " + blockContent.date);
	console.log("DATA : Sender   -> " + blockContent.data["sender"]);
	console.log("       Reciever -> " + blockContent.data["reciever"]);
	console.log("       Sum      -> " + blockContent.data["sum"]);
	console.log("PREVIOUS HASH: " + blockContent.prehash);
	console.log("CURRENT HASH : " + blockContent.hash);
	console.log("-----------------------------");
}

const readBlocks = () => {

	if (!fs.existsSync(DIRNAME)) {
		writeError("Blocks not found");

		return;
	}

	if (!fs.existsSync(DIRNAME + "0.json")) {
		writeError("Genesis block not found");
	}

	let lastBlock = getLastBlock();

	console.log("SOFT TEST (from block):");
	for (let i = 1; i <= lastBlock; i++) {
		softTest(i);
	}

	console.log("\nHARD TEST (from next block):");
	if (fs.readdirSync(DIRNAME).length <= 2) {
		writeInfo("Not enough blocks");

		return;
	} 

	for (let i = 2; i <= lastBlock; i++) {
		hardTest(i);
	}

}

const softTest = (index) => {

	let currBlockName = index.toString() + ".json";

	if (!isExist(currBlockName)) {
		console.log("[BLOCK]: " + index.toString() + " [STATUS] -> \033[91mCorrupted\033[0m");

		return;
	}

	let content = fs.readFileSync(DIRNAME + currBlockName, "utf-8");
	let currBlockContent = JSON.parse(content);

	let data = currBlockContent.data["sender"] + currBlockContent.data["reciever"] + currBlockContent.data["sum"];
	let currBlockData = currBlockContent.index + currBlockContent.date + data + currBlockContent.prehash;

	if (calculateHash(currBlockData) != currBlockContent.hash) {
		console.log("[BLOCK]: " + index.toString() + " [STATUS] -> \033[91mCorrupted\033[0m");
	} else {
		console.log("[BLOCK]: " + index.toString() + " [STATUS] -> \033[92mReadable\033[0m");
	}

}

const hardTest = (index) => {

	let prevBlockName = (index-1).toString() + ".json";
	let currBlockName = index.toString() + ".json";

	if (!isExist(prevBlockName)) {
		console.log("[BLOCK]: " + (index-1).toString() + " [STATUS] -> \033[91mCorrupted\033[0m");
		return;
	} 

	if (!isExist(currBlockName)) {
		console.log("[BLOCK]: " + (index-1).toString() + " [STATUS] -> \033[93mUnknown\033[0m");
		console.log("[BLOCK]: " + index.toString() + " [STATUS] -> \033[91mCorrupted\033[0m");

		return;
	}


	let content = fs.readFileSync(DIRNAME + currBlockName, "utf-8");
	let currBlockContent = JSON.parse(content);

	content = fs.readFileSync(DIRNAME + prevBlockName, "utf-8");
	let prevBlockContent = JSON.parse(content);

	let data = prevBlockContent.data["sender"] + prevBlockContent.data["reciever"] + prevBlockContent.data["sum"];
	let prevBlockData = prevBlockContent.index + prevBlockContent.date + data + prevBlockContent.prehash;

	if (calculateHash(prevBlockData) != currBlockContent.prehash
		||
		calculateHash(prevBlockData) != prevBlockContent.hash) {
		console.log("[BLOCK]: " + (index-1).toString() + " [STATUS] -> \033[91mCorrupted\033[0m");
	} else {
		console.log("[BLOCK]: " + (index-1).toString() + " [STATUS] -> \033[92mReadable\033[0m");
	}

}

const writeBlock = () => {

	let block = getData();

	if (block) {
		if (!fs.existsSync(DIRNAME)) {
			fs.mkdirSync(DIRNAME);
			writeInfo("Directory created");
		}

		if (!fs.existsSync(DIRNAME + "0.json")) {
			createGenesis();
		} else {
			writeInfo("Genesis block found");
		}

		let currentBlock = getLastBlock() + 1;
		let filename  = currentBlock.toString() + ".json";
		let str = JSON.stringify(block);

		writeInfo("Previous block: " + getLastBlock());

		fs.writeFile(DIRNAME + filename, str, (err) => {
			if (err) throw err;
			console.log("[\033[92m  OK  \033[0m] Block saved!");
		})
	}
}

const getData = () => {

	if (process.argv.length < 6) {
		writeError("More information required!");
		console.log("USAGE:");
		console.log("node main.js -w {SENDER} {RECIEVER} {SUM}");
	} else {
		let date = Date();
		let data = {
			"sender": process.argv[3],
			"reciever": process.argv[4],
			"sum": process.argv[5]
		}

		let strData = data["sender"] + data["reciever"] + data["sum"];

		let block = {
			"index": getLastBlock() + 1,
			"date": date,
			"data": data,
			"prehash": getHash(getLastBlock()),
			"hash": calculateHash((getLastBlock() + 1).toString() + date + strData + getHash(getLastBlock()))
		}

		return block;
	}

}

const getLastBlock = () => {

	let max = 0;

	if (!fs.existsSync(DIRNAME)) {
		fs.mkdirSync(DIRNAME);
		writeInfo("Directory created");
	}

	if (!fs.existsSync(DIRNAME + "0.json")) {
		createGenesis();
	}

	fs.readdirSync(DIRNAME).forEach(file => {
			let num = parseInt(file.split(".")[0], 10);

			if (num > max) {
				max = num;
			}
	});

	return max;

}

const getHash = (lastBlock) => {

	let filename = lastBlock + ".json";

	let content = fs.readFileSync(DIRNAME + filename, "utf-8");
	let blockData = JSON.parse(content);
	let data = "";
	let str = "";

	if (lastBlock != 0) {
		data = blockData.data["sender"] + blockData.data["reciever"] + blockData.data["sum"];
		str = blockData.index + blockData.date + data + blockData.prehash;
	} else {
		str = blockData["title"] + blockData["date"] + blockData["author"];
	}

	return calculateHash(str);

}

const calculateHash = (blockData) => {
	const hash = crypto.createHmac("sha256", blockData.toString()).digest("hex");

	return hash;
}

const createGenesis = () => {

	let genesisData = {
		"title": "Blockchain",
		"date": Date(),
		"author": "PixHead"
	}

	let str = JSON.stringify(genesisData);

	fs.writeFileSync(DIRNAME + "0.json", str);
	writeInfo("Genesis block created");

}

const isExist = (filename) => {

	if (!fs.existsSync(DIRNAME + filename)) {
		return false;
	} else {
		return true;
	}

}

const writeError = (err) => {
	console.log("[ \033[91mERROR \033[0m] " + err );
}

const writeInfo = (info) => {
	console.log("[\033[94m INFO \033[0m] " + info);
}

checkArgs();
