import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// The bucket name from configuration
const BUCKET_NAME = 'mro-logix-amazons3-bucket';
const FLIGHT_RECORDS_FOLDER = 'flight-records';
const TECHNICIAN_TRAINING_FOLDER = 'technician-training';
const INCOMING_INSPECTION_FOLDER = 'incoming-inspections';
const SMS_REPORTS_FOLDER = 'sms-reports';

/**
 * Uploads a file to the S3 bucket in the flight records folder
 * @param file The file to upload
 * @param fileName Optional custom filename
 * @returns The key of the uploaded file
 */
export async function uploadFlightRecordFile(file: File, flightRecordId: string): Promise<string> {
  // Create a unique key for the file
  const fileName = `${flightRecordId}/${Date.now()}-${file.name}`;
  const key = `${FLIGHT_RECORDS_FOLDER}/${fileName}`;
  
  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type
  });
  
  await s3Client.send(command);
  
  return key;
}

/**
 * Generate a signed URL for accessing a file from S3
 * @param fileKey The S3 object key
 * @param expiresIn Time in seconds until the URL expires (default: 1 hour)
 * @returns Signed URL for file access
 */
export function getFileUrl(fileKey: string): string {
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;
}

/**
 * Retrieves a file from S3 bucket
 * @param fileKey The key of the file to retrieve
 * @returns The file data as a Buffer or null if not found
 */
export async function getFlightRecordFile(fileKey: string): Promise<Buffer | null> {
  try {
    console.log(`Retrieving file with key: ${fileKey}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      console.error('S3 response body is empty');
      return null;
    }
    
    try {
      // Convert stream to buffer
      const arrayBuffer = await response.Body.transformToByteArray();
      return Buffer.from(arrayBuffer);
    } catch (streamError) {
      console.error('Error converting stream to buffer:', streamError);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving file from S3:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return null;
  }
}

/**
 * Deletes a file from the S3 bucket
 * @param fileKey The key of the file to delete
 * @returns Promise that resolves when the file is deleted
 */
export async function deleteFlightRecordFile(fileKey: string): Promise<void> {
  try {
    console.log(`Deleting file from S3: ${fileKey}`);
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey
    });
    
    await s3Client.send(command);
    console.log(`Successfully deleted file: ${fileKey}`);
  } catch (error) {
    console.error(`Error deleting file ${fileKey} from S3:`, error);
    throw error;
  }
}

// Stock Inventory file handling
export async function uploadStockInventoryFile(file: File, stockInventoryId: string): Promise<string> {
  const fileKey = `stock-inventory/${stockInventoryId}/${Date.now()}-${file.name}`;
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
    }));
    
    return fileKey;
  } catch (error) {
    console.error('Error uploading stock inventory file:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload stock inventory file: ${error.message}`);
    }
    throw new Error('Failed to upload stock inventory file: Unknown error');
  }
}

export async function getStockInventoryFile(fileKey: string): Promise<Buffer | null> {
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    }));
    
    if (!response.Body) {
      return null;
    }
    
    // Convert the readable stream to a buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as unknown as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error getting stock inventory file:', error);
    return null;
  }
}

export async function deleteStockInventoryFile(fileKey: string): Promise<void> {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    }));
  } catch (error) {
    console.error('Error deleting stock inventory file:', error);
    throw new Error('Failed to delete stock inventory file');
  }
}

/**
 * Uploads a file to the S3 bucket in the technician-training folder
 * @param file The file to upload
 * @param technicianTrainingId The technician training record ID
 * @returns The key of the uploaded file
 */
export async function uploadTechnicianTrainingFile(file: File, technicianTrainingId: string): Promise<string> {
  const fileName = `${technicianTrainingId}/${Date.now()}-${file.name}`;
  const key = `${TECHNICIAN_TRAINING_FOLDER}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type
  });

  await s3Client.send(command);

  return key;
}

/**
 * Deletes a file from the S3 bucket
 * @param fileKey The key of the file to delete
 */
export async function deleteTechnicianTrainingFile(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey
  });

  await s3Client.send(command);
}

/**
 * Retrieves a technician training file from S3 bucket
 * @param fileKey The key of the file to retrieve
 * @returns The file data as a Buffer or null if not found
 */
export async function getTechnicianTrainingFile(fileKey: string): Promise<Buffer | null> {
  try {
    console.log(`Retrieving technician training file with key: ${fileKey}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      console.error('S3 response body is empty');
      return null;
    }
    
    try {
      // Convert stream to buffer
      const arrayBuffer = await response.Body.transformToByteArray();
      return Buffer.from(arrayBuffer);
    } catch (streamError) {
      console.error('Error converting stream to buffer:', streamError);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving technician training file from S3:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return null;
  }
}

/**
 * Uploads a file to the S3 bucket in the incoming inspection folder
 * @param file The file to upload
 * @param incomingInspectionId The incoming inspection record ID
 * @returns The key of the uploaded file
 */
export async function uploadIncomingInspectionFile(file: File, incomingInspectionId: string): Promise<string> {
  const fileName = `${incomingInspectionId}/${Date.now()}-${file.name}`;
  const key = `${INCOMING_INSPECTION_FOLDER}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type
  });

  await s3Client.send(command);

  return key;
}

/**
 * Deletes an incoming inspection file from the S3 bucket
 * @param fileKey The key of the file to delete
 */
export async function deleteIncomingInspectionFile(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey
  });

  await s3Client.send(command);
}

/**
 * Retrieves an incoming inspection file from S3 bucket
 * @param fileKey The key of the file to retrieve
 * @returns The file data as a Buffer or null if not found
 */
export async function getIncomingInspectionFile(fileKey: string): Promise<Buffer | null> {
  try {
    console.log(`Retrieving incoming inspection file with key: ${fileKey}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      console.error('S3 response body is empty');
      return null;
    }
    
    try {
      // Convert stream to buffer
      const arrayBuffer = await response.Body.transformToByteArray();
      return Buffer.from(arrayBuffer);
    } catch (streamError) {
      console.error('Error converting stream to buffer:', streamError);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving incoming inspection file from S3:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return null;
  }
}

// Document Storage S3 Functions
const DOCUMENT_STORAGE_FOLDER = 'document-storage';
const MANUALS_FOLDER = 'manuals';

/**
 * Uploads a file to the S3 bucket in the document storage folder
 * @param file The file to upload
 * @param userId The user ID who owns the file
 * @param folderPath Optional folder path within user's storage
 * @param isManual Whether this is a manual document (will use manuals folder if true)
 * @returns The key of the uploaded file
 */
export async function uploadDocumentFile(file: File, userId: string, folderPath?: string, isManual: boolean = false): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  let filePath;
  if (isManual) {
    // Store manuals in a dedicated folder
    filePath = `${MANUALS_FOLDER}/${userId}/${timestamp}-${sanitizedFileName}`;
  } else {
    // Regular document storage path
    filePath = `${DOCUMENT_STORAGE_FOLDER}/${userId}`;
    if (folderPath) {
      filePath += `/${folderPath}`;
    }
    filePath += `/${timestamp}-${sanitizedFileName}`;
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        'original-filename': file.name,
        'user-id': userId,
        'upload-timestamp': timestamp.toString(),
        'document-type': isManual ? 'manual' : 'document'
      }
    });
    
    await s3Client.send(command);
    console.log(`Successfully uploaded document file: ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('Error uploading document file:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload document file: ${error.message}`);
    }
    throw new Error('Failed to upload document file: Unknown error');
  }
}

/**
 * Retrieves a document file from S3 bucket
 * @param fileKey The key of the file to retrieve
 * @returns The file data as a Buffer or null if not found
 */
export async function getDocumentFile(fileKey: string): Promise<Buffer | null> {
  try {
    console.log(`Retrieving document file with key: ${fileKey}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      console.error('S3 response body is empty');
      return null;
    }
    
    try {
      // Convert stream to buffer
      const arrayBuffer = await response.Body.transformToByteArray();
      return Buffer.from(arrayBuffer);
    } catch (streamError) {
      console.error('Error converting stream to buffer:', streamError);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving document file from S3:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return null;
  }
}

/**
 * Deletes a document file from the S3 bucket
 * @param fileKey The key of the file to delete
 */
export async function deleteDocumentFile(fileKey: string): Promise<void> {
  try {
    console.log(`Deleting document file from S3: ${fileKey}`);
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey
    });
    
    await s3Client.send(command);
    console.log(`Successfully deleted document file: ${fileKey}`);
  } catch (error) {
    console.error(`Error deleting document file ${fileKey} from S3:`, error);
    throw error;
  }
}

/**
 * Get a signed URL for document file access
 * @param fileKey The S3 object key
 * @returns URL for file access
 */
export function getDocumentFileUrl(fileKey: string): string {
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;
}

// Airport ID S3 Functions
const AIRPORT_ID_FOLDER = 'airport-id';

/**
 * Uploads a file to the S3 bucket in the airport ID folder
 * @param file The file to upload
 * @param airportId The airport ID record ID
 * @returns The key of the uploaded file
 */
export async function uploadAirportIdFile(file: File, airportId: string): Promise<string> {
  const fileName = `${airportId}/${Date.now()}-${file.name}`;
  const key = `${AIRPORT_ID_FOLDER}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type
  });

  await s3Client.send(command);

  return key;
}

/**
 * Deletes an airport ID file from the S3 bucket
 * @param fileKey The key of the file to delete
 */
export async function deleteAirportIdFile(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey
  });

  await s3Client.send(command);
}

/**
 * Retrieves an airport ID file from S3 bucket
 * @param fileKey The key of the file to retrieve
 * @returns The file data as a Buffer or null if not found
 */
export async function getAirportIdFile(fileKey: string): Promise<Buffer | null> {
  try {
    console.log(`Retrieving airport ID file with key: ${fileKey}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      console.error('S3 response body is empty');
      return null;
    }
    
    try {
      // Convert stream to buffer
      const arrayBuffer = await response.Body.transformToByteArray();
      return Buffer.from(arrayBuffer);
    } catch (streamError) {
      console.error('Error converting stream to buffer:', streamError);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving airport ID file from S3:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return null;
  }
}

// SMS Reports file handling
export async function uploadSMSReportFile(file: File, smsReportId: string): Promise<string> {
  const fileName = `${smsReportId}/${Date.now()}-${file.name}`;
  const key = `${SMS_REPORTS_FOLDER}/${fileName}`;
  
  try {
    // Convert file to buffer - same approach as other upload functions
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type
    });
    
    await s3Client.send(command);
    
    return key;
  } catch (error) {
    console.error('Error uploading SMS report file:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload SMS report file: ${error.message}`);
    }
    throw new Error('Failed to upload SMS report file: Unknown error');
  }
}

export async function getSMSReportFile(fileKey: string): Promise<Buffer | null> {
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    }));
    
    if (!response.Body) {
      return null;
    }
    
    // Convert the readable stream to a buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as unknown as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error getting SMS report file:', error);
    return null;
  }
}

export async function deleteSMSReportFile(fileKey: string): Promise<void> {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    }));
  } catch (error) {
    console.error('Error deleting SMS report file:', error);
    throw new Error('Failed to delete SMS report file');
  }
}

// SDR Reports file handling
const SDR_REPORTS_FOLDER = 'sdr-reports';

export async function uploadSDRReportFile(file: File, sdrReportId: string): Promise<string> {
  const fileName = `${sdrReportId}/${Date.now()}-${file.name}`;
  const key = `${SDR_REPORTS_FOLDER}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type
  });

  await s3Client.send(command);

  return key;
}

export async function getSDRReportFile(fileKey: string): Promise<Buffer | null> {
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    }));

    if (!response.Body) {
      return null;
    }

    const arrayBuffer = await response.Body.transformToByteArray();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error getting SDR report file:', error);
    return null;
  }
}

export async function deleteSDRReportFile(fileKey: string): Promise<void> {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    }));
  } catch (error) {
    console.error('Error deleting SDR report file:', error);
    throw new Error('Failed to delete SDR report file');
  }
}