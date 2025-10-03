import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



const makeEst = (i: number) => ({
  id: `est-${i}`,
  name: [
    'Level Barber Shop',
    'Glow Studio',
    'Zen Spa',
    'Pulse Gym',
    'Art & Craft Lab',
    'Rhythm Dance',
    'Cook & Learn',
    'Aqua Swim',
    'Climb High',
    'Code Camp',
  ][i % 10] + ` ${Math.floor(i / 10) + 1}`,
  area: ['Seef', 'Manama', 'Riffa', 'Saar', 'Muharraq'][i % 5],
  tag: ['Barber', 'Salon', 'Spa', 'Fitness', 'Hobby'][i % 5],
  rating: (4 + (i % 10) / 10).toFixed(1),
});

const RECOMMENDED = Array.from({ length: 18 }, (_, i) => makeEst(i)).slice(0, 15);
const NEW_TO_HOBBY = Array.from({ length: 17 }, (_, i) => makeEst(i + 20)).slice(0, 15);
const TRENDING = Array.from({ length: 19 }, (_, i) => makeEst(i + 40)).slice(0, 15);

const CATEGORIES = [
  {
    id: 'c1',
    name: 'Sports & fitness',
    img: require('../../assets/images/categories/sports.jpeg'),
  },
  {
    id: 'c2',
    name: 'Water activities',
    img: require('../../assets/images/categories/swimming.jpeg'),
  },
  {
    id: 'c3',
    name: 'Arts & crafts',
    img: require('../../assets/images/categories/arts.jpeg'),
  },
  {
    id: 'c4',
    name: 'Music & performing arts',
    img: require('../../assets/images/categories/music.jpeg'),
  },
  {
    id: 'c5',
    name: 'Cooking',
    img: require('../../assets/images/categories/cooking.jpg'),
  },
  {
    id: 'c6',
    name: 'Technology & coding',
    img: require('../../assets/images/categories/technology.jpg'),
  },
  {
    id: 'c7',
    name: 'Languages',
    img: require('../../assets/images/categories/language.jpeg'),
  },
  {
    id: 'c8',
    name: 'Outdoor & adventure',
    img: require('../../assets/images/categories/outdoor.jpg'),
  },
  {
    id: 'c9',
    name: 'Chess & board games',
    img: require('../../assets/images/categories/chess.jpg'),
  },
  {
    id: 'c10',
    name: 'Photography & media',
    img: require('../../assets/images/categories/photography.jpeg'),
  },
];

// ---------- Card components ----------
const CARD_W = Math.min(Math.floor(Dimensions.get('window').width * 0.78), 320);
const PLACEHOLDER_BG = [
  'bg-violet-200',
  'bg-indigo-200',
  'bg-fuchsia-200',
  'bg-rose-200',
  'bg-amber-200',
  'bg-emerald-200',
  'bg-sky-200',
  'bg-lime-200',
  'bg-teal-200',
  'bg-orange-200',
];

function EstablishmentCard({
  item,
  colorClass,
}: {
  item: ReturnType<typeof makeEst>;
  colorClass: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className="mr-4"
      style={{ width: 275 }} 
    >
      <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
       
        <View className={`w-full h-48 ${colorClass}`} /> 
        
        <View className="p-3">
          <Text
            className="text-base font-semibold text-gray-900"
            numberOfLines={1}
          >
            {item.name}
          </Text>

         
          <View className="mt-1">
            <Text className="text-[13px] font-semibold text-gray-800">⭐ {item.rating}</Text>
            <Text className="text-[13px] pt-1 pb-1 text-gray-500">{item.area}</Text>
          </View>

          <View className="mt-2 self-start rounded-full px-2.5 py-1 bg-gray-100">
            <Text className="text-[12px] text-gray-700">{item.tag}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CategoryCard({ name, img }: { name: string; img: any }) {
  return (
    <TouchableOpacity activeOpacity={0.9} className="flex-1">
      <View className="h-28 mb-4 mr-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 flex-row">
        {/* 60% TEXT */}
        <View className="flex-[2] justify-center px-4">
          <Text
            className="text-[13px] font-bold text-gray-900 leading-tight"
            numberOfLines={4}
          >
            {name}
          </Text>
        </View>

        {/* 40% IMAGE */}
        <View className="flex-[3]">
          <Image source={img} className="w-full h-full" resizeMode="cover" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ---------- Section helpers ----------
function HorizontalSection({
  title,
  data,
}: {
  title: string;
  data: ReturnType<typeof makeEst>[];
}) {
  const capped = useMemo(() => data.slice(0, 15), [data]);
  return (
    <View className="mt-10">
      <Text className="text-[21px] font-bold text-gray-900 mb-4">{title}</Text>
      <FlatList
        horizontal
        data={capped}
        keyExtractor={(it) => it.id}
        renderItem={({ item, index }) => (
          <EstablishmentCard
            item={item}
            colorClass={PLACEHOLDER_BG[index % PLACEHOLDER_BG.length]}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      />
    </View>
  );
}

// ---------- Screen ----------
export default function HomeScreen() {
  const userName = 'Ali'; 

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }} // a bit more bottom space
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View className="px-5 pt-2">
          <Text className="text-[34px] font-extrabold text-gray-900">Hey, {userName}</Text>
        </View>

        {/* Carousels */}
        <View className="px-5">
          <HorizontalSection title="Recommended" data={RECOMMENDED} />
          <HorizontalSection title="New to Hobby" data={NEW_TO_HOBBY} />
          <HorizontalSection title="Trending" data={TRENDING} />
        </View>

        {/* Categories (5x2 grid) */}
        <View className="px-5 mt-12">{/* more spacing before categories */}
          <Text className="text-[22px] font-bold text-gray-900 mb-4">Categories</Text>
          <FlatList
           data={CATEGORIES}
           keyExtractor={(it) => it.id}
           numColumns={2}
           scrollEnabled={false}
           columnWrapperStyle={{ justifyContent: 'space-between' }}
           renderItem={({ item }) => <CategoryCard name={item.name} img={item.img} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
