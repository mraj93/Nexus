import mongoose from "mongoose";

const nftSchema = new mongoose.Schema ({
    tokenId: Number,
    nftName: String,
    price: Number,
    description: String,
    nftURI: String,
    metaDataURI: String,
    generateReceipt: String
}, {collection : 'nft'})

const NFTSchema = mongoose.model("Transaction", nftSchema);

export default NFTSchema;