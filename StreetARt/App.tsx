import React, { useState } from 'react';
import { View, Button, Alert, Text, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Video, ResizeMode } from 'expo-av';
import { ViroARSceneNavigator, ViroARScene, ViroVideo, ViroImage } from 'react-viro';

const apiKey = '9aadd674-cf96-4fd1-9c28-b21f21f72b62';
const baseUrl = 'https://api.novita.ai';

const sendImageToApi = async (imageUri: string, setLoading: (loading: boolean) => void, setTaskId: (id: string | null) => void) => {
  try {
    setLoading(true);

    const imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await axios.post(
      `${baseUrl}/v3/async/img2video`,
      {
        model_name: 'SVD-XT',
        image_file: `data:image/png;base64,${imageBase64}`,
        frames_num: 25,
        frames_per_second: 6,
        image_file_resize_mode: 'CROP_TO_ASPECT_RATIO',
        steps: 30,
        enable_frame_interpolation: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const taskId = response.data.task_id;
    setTaskId(taskId);
    Alert.alert('Task Submitted', `Task ID: ${taskId}`);
  } catch (error: any) {
    console.error('Error while sending image to API:', error.response ? error.response.data : error);
    Alert.alert('Error', 'Failed to send image to API');
  } finally {
    setLoading(false);
  }
};

const fetchVideoResult = async (taskId: string, setVideoUri: (uri: string | null) => void) => {
  try {
    const response = await axios.get(`${baseUrl}/v3/async/task-result`, {
      params: { task_id: taskId },
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.data.task.status === 'TASK_STATUS_SUCCEED' && response.data.videos.length > 0) {
      const videoUrl = response.data.videos[0].video_url;
      setVideoUri(videoUrl);
      Alert.alert('Video Ready', 'Your video has been generated.');
    } else {
      Alert.alert('Processing', 'The video is still being processed. Try again later.');
    }
  } catch (error: any) {
    console.error('Error fetching video result:', error.response ? error.response.data : error);
    Alert.alert('Error', 'Failed to fetch video result');
  }
};

const App = () => {
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [showAR, setShowAR] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;

      // Resize the image if it exceeds 2048 pixels in width or height
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 2048, height: 2048 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      sendImageToApi(manipulatedImage.uri, setLoading, setTaskId);
    }
  };

  if (showAR && videoUri) {
    return (
      <ViroARSceneNavigator
        initialScene={{
          scene: () => (
            <ViroARScene>
              <ViroImage
                source={{ uri: 'https://replicate.delivery/pbxt/JvLi9smWKKDfQpylBYosqQRfPKZPntuAziesp0VuPjidq61n/rocket.png' }}
                position={[0, 0, -2]}
                scale={[1, 1, 1]}
              />
              <ViroVideo
                source={{ uri: videoUri }}
                position={[0, 0, -2]}
                scale={[1, 1, 1]}
                loop={true}
              />
            </ViroARScene>
          ),
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Pick an Image and Send to API" onPress={pickImage} />
      )}
      {taskId && (
        <Button title="Fetch Video Result" onPress={() => fetchVideoResult(taskId, setVideoUri)} />
      )}
      {videoUri && (
        <View style={{ marginTop: 20 }}>
          <Text>Video Preview:</Text>
          <Video
            source={{ uri: videoUri }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            useNativeControls
            style={{ width: 300, height: 300 }}
          />

          <Button title="View in AR" onPress={() => setShowAR(true)} />
        </View>
      )}
    </View>
  );
};

export default App;
