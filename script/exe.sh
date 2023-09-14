#!/bin/bash

usage() {
    echo "Usage: $0 [-i <id>] [-b <bucket>] [-t <table>]" 1>&2
    exit 1
}

exit_abnormal() {
    echo Something went wrong >&2
    exit 1
}

finish() {
    # generate a temporary file in /tmp
    TEMPFILE=$(mktemp)
    # get the filename from the path
    TEMPFILE_FILENAME=$(basename $TEMPFILE)
    # get the record corresponding to [-i id] from dynamodb
    data=$(aws dynamodb get-item --table-name $TABLENAME --key '{"id": {"S": "'$ID'"}}')
    # get the input_file_path, input_text and id from the record
    path=$(echo $data | jq '.Item.input_file_path.S' -r)
    text=$(echo $data | jq '.Item.input_text.S' -r)
    id=$(echo $data | jq '.Item.id.S' -r)
    # download the file from s3
    aws s3 cp s3://$path $TEMPFILE || exit_abnormal
    # append the text to the file
    printf ":%s" "$text" >> $TEMPFILE
    # upload the file to s3
    # OUTFILE is the path of the output file in s3
    OUTFILE=$BUCKET/$TEMPFILE_FILENAME.out.txt
    aws s3 cp $TEMPFILE s3://$OUTFILE || exit_abnormal
    # update the record in dynamodb
    ITEM=$(echo $data | jq '.Item+{output_file_path:{S:"'$OUTFILE'"}}')
    aws dynamodb put-item --table-name $TABLENAME --item "$ITEM" || exit_abnormal
}

# get the id from the command line arguments
# $0 [-i id] [-b bucket] [-t table]
while getopts ":i:b:t:" o; do
    case "${o}" in
        i)
            ID=${OPTARG}
            ;;
        b)
            BUCKET=${OPTARG}
            ;;
        t)
            TABLENAME=${OPTARG}
            ;;
        *)
            usage
            ;;
    esac
done
shift $((OPTIND-1))
# if id is not provided, show usage
if [ -z "${ID}" ]; then
    usage
fi
if [ -z "${BUCKET}" ]; then
    usage
fi
if [ -z "${TABLENAME}" ]; then
    usage
fi
# call finish
finish