import Web3 from "web3";
import express, {raw} from "express";
import cors from 'cors';
import ContractJSON from './JSON/ERC721.sol/MultiTokenERC721.json' assert {type: "json"};
import dotenv from "dotenv";
import {ethers} from "ethers";
dotenv.config();

// import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import ConnectDB from "./connectDB.js";
import NFTSchema from "./Schema/nft.js";

// const dynamoDBClient = new DynamoDBClient({
//     region: process.env.REGION,
//     credentials: {
//         accessKeyId: process.env.ACCESS_KEY,
//         secretAccessKey: process.env.SECRET_ACCESS_KEY
//     }
// });

ConnectDB();

let web3 = new Web3(process.env.API_URL);
const {ADDRESS, PRIVATE_KEY } = process.env;
const app = express();
const ContractAddress = "0x2E5d994CA738ae8B83277ce361A4A68180324dD1";
const Contract = new web3.eth.Contract(
    ContractJSON.abi,
    ContractAddress
);

const PORT = process.env.PORT || 9090;
app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
    console.log("Server is running")
});

//Todo get Hello World
app.get('/hello', async (req, res) => {
    console.log("Hello World")
    res.status(200).json({
        "message" : "Hello"
    })
})

//Todo MintERC721
const mintERC721 = async (req, res) => {
    {
        try {
            const data = req.body;

            const priceInWei = web3.utils.toWei(data.price.toString(), 'ether'); // Convert to Wei
            const priceInWeiString = priceInWei.toString();

            console.log("price of ETH", data.price);

            console.log("generateReceipt is here", data);
            try {
                    const savedData = await NFTSchema.create({
                        tokenId: data.tokenID,
                        nftName: data.nftName,
                        price: priceInWeiString,
                        description: data.description,
                        nftURI: data.nftURI,
                        metaDataURI: data.metaDataURI,
                        generateReceipt: data.generateReceipt
                    })
                    console.log("Data saved:", savedData);
                    res.status(200).json({ message: "Data saved successfully" });
                } catch (e) {
                    console.error("error while saving the data", e)
                }
        } catch (e) {
            console.log(e)
            res.status(404).json({
                "message": "Mint fail" + e
            })
        }
    }
}
app.route('/mintERC721').post(mintERC721);

//Todo get ERC721 token details
app.get('/NFTDetails/:tokenId', async (req, res) => {
    try {
        let owner = await Contract.methods.ownerOf(req.params.tokenId).call();
        let creator = await Contract.methods.Creator(req.params.tokenId).call();
        // let NFTDetail = await Contract.methods.NFTDetail(req.params.tokenId).call();
        const nftData = await NFTSchema.findOne({tokenId: req.params.tokenId}).select('-_id');
        res.status(200).json({
            "data": nftData,
            "creator": creator,
            "owner": owner
        });
        console.log("Details is here", nftData, creator,owner);
    } catch (e) {
        console.log(e)
        res.status(500).json({
            "message": "error" + e
        })
    }
});

//Todo GetAllNFTsright-icon
app.get('/getAllnfts', async (req, res) => {
    try {
        const allNFTs = await NFTSchema.find({});
        console.log(allNFTs)
        res.status(200).json({
            "data": allNFTs
        });
    } catch (e) {
        console.error('Error while fetching NFTs:', e);
        res.status(500).json({message: 'Internal server error'});
    }
});

//Todo update metadata
app.post('/updateMetadata', async (req, res) => {
    try {
        const nonce = await web3.eth.getTransactionCount(ADDRESS);
        const oldMetadata = await Contract.methods.tokenURI(req.body.tokenId).call();
        console.log("oldMetaData :", oldMetadata);
        const gasPrice = (await web3.eth.getGasPrice()).toString() || '2000000000000';
        const txn = await web3.eth.accounts.signTransaction({
                from: ADDRESS,
                to: ContractAddress,
                nonce: nonce,
                gasPrice: gasPrice,
                gasLimit: 500000,
                data: Contract.methods.updateTokenMetadataURI(
                    req.body.tokenId,
                    req.body.newMetadataURI,
                ).encodeABI(),
            },
            PRIVATE_KEY
        );
        await NFTSchema.findOneAndUpdate(
            {tokenId: req.body.tokenId},
            {metaDataURI: req.body.newMetadataURI},
            {new: true}
        );
        const generateReceipt = await web3.eth.sendSignedTransaction(txn.rawTransaction);
        res.status(200).json({
            "message": "MetaData Updated with hash:" + generateReceipt
        });
    } catch (e) {
        console.log(e)
        res.status(404).json({
            "error": e
        })
    }
});

// Todo to get latest tokenID
app.get('/latestTokenId', async (req, res) => {
    try {
        let latestTokenId = await Contract.methods.tokenID().call();
        res.status(200).json({latestTokenId: latestTokenId.toString()});
    } catch (e) {
        res.status(500).json({
            "error": e
        })
    }
})

// Todo get the recent NFTs
app.get('/recentNFTs', async (req, res) => {
    try {
        let latestTokenId = await Contract.methods.tokenId().call();
        const recentNFTs = await NFTSchema.find({}).sort({ latestTokenId: -1 }).limit(6);
        res.status(200).json({
            "data" : recentNFTs
        });
        console.log(recentNFTs);
    } catch (e) {
        console.error('Error while fetching recent NFTs', e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// "test": "echo \"Error: no test specified\" && exit 1",