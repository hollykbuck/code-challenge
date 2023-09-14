import { RunInstancesCommand, EC2Client } from "@aws-sdk/client-ec2";
import { basename } from 'node:path'
const REGION = process.env.REGION
const BUCKET = process.env.BUCKET
const TABLE = process.env.TABLE
const SCRIPTFILE = process.env.SCRIPTFILE
const SCRIPT = `
#cloud-config
runcmd:
- aws s3 cp s3://${BUCKET}/${SCRIPTFILE} .
- bash ./${basename(SCRIPTFILE)} -i #### -b ${BUCKET} -t ${TABLE}
- systemctl poweroff
`
// the aws official image, aws cli is preinstalled on this image
const SECURITY_GROUP = process.env.SECURITY_GROUP
const IMAGEID = "ami-0b825ad86ddcfb907";
// the purpose of this iam role is to allow the ec2 instance 
// to access the s3 bucket and dynamodb table
const IAMROLE = process.env.IAMROLE
const client = new EC2Client({ region: REGION })
export const handler = async (event) => {
    if (event.Records.length != 1) {
        return
    }
    const record = event.Records[0]
    if (record.eventName != "INSERT") {
        return
    }
    const id = record.dynamodb.NewImage?.id.S
    console.log(record.dynamodb)
    const userdata = Buffer.from((SCRIPT.replace("####", id))).toString("base64")

    const command = new RunInstancesCommand({
        ImageId: IMAGEID,
        InstanceType: "t2.micro",
        MinCount: 1,
        MaxCount: 1,
        SecurityGroupIds: [SECURITY_GROUP],
        UserData: userdata,
        IamInstanceProfile: {
            Arn: IAMROLE,
        },
        InstanceInitiatedShutdownBehavior: "terminate"
    })
    await client.send(command)
    return
};
