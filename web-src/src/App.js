import React from 'react';
import { Flex, View, Heading, Text, Well } from '@adobe/react-spectrum';

function App() {
  return (
    <View padding="size-400" maxWidth="800px" marginX="auto">
      <Flex direction="column" gap="size-300" alignItems="center">
        <Heading level={1} UNSAFE_style={{ marginTop: "60px" }}>🚀 waymo-revs</Heading>
        <Well UNSAFE_style={{ borderRadius: "12px", padding: "24px", textAlign: "center" }}>
          <Text UNSAFE_style={{ fontSize: "48px", display: "block" }}>🎉</Text>
          <Heading level={3}>HOORAY! APP COMPLETE</Heading>
          <Text UNSAFE_style={{ fontSize: "13px", color: "#888" }}>
            이 페이지가 보이면 로컬 개발 서버가 정상 작동하는 것입니다.
          </Text>
        </Well>
      </Flex>
    </View>
  );
}

export default App;