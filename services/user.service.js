const User=require("../models/User");
const Investment=require("../models/Investment");
const bcrypt=require("bcryptjs");

exports.createUser=async(data)=>{
 const exist=await User.findOne({email:data.email});
 if(exist) throw new Error("User exists");
 data.password=await bcrypt.hash(data.password,10);
 return await User.create(data);
};

exports.updateSingleUserWithInvestment=async(id,uData,iData)=>{
 const user=await User.findByIdAndUpdate(id,uData,{new:true});
 let inv=null;
 if(iData){
  inv=await Investment.findOneAndUpdate({user:id},iData,{new:true});
 }
 return {user,inv};
};
