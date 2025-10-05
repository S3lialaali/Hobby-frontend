import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchEstablishments, resolveImageUrl } from '../../api';

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

// ---- default hardcoded fallbacks (kept) ----
const RECOMMENDED = Array.from({ length: 18 }, (_, i) => makeEst(i)).slice(0, 15);
const NEW_TO_HOBBY = Array.from({ length: 17 }, (_, i) => makeEst(i + 20)).slice(0, 15);
const TRENDING = Array.from({ length: 19 }, (_, i) => makeEst(i + 40)).slice(0, 15);

// ⚠️ Keep your category image requires exactly matching file names in /assets
const CATEGORIES = [
  { id: 'c1', name: 'Sports & fitness', img: require('../../assets/images/categories/sports.jpeg') },
  { id: 'c2', name: 'Water activities', img: require('../../assets/images/categories/swimming.jpeg') },
  { id: 'c3', name: 'Arts & crafts', img: require('../../assets/images/categories/arts.jpeg') },
  { id: 'c4', name: 'Music & performing arts', img: require('../../assets/images/categories/music.jpeg') },
  { id: 'c5', name: 'Cooking', img: require('../../assets/images/categories/cooking.jpeg') },        // <-- ensure file is .jpeg or change to .jpg if needed
  { id: 'c6', name: 'Technology & coding', img: require('../../assets/images/categories/technology.jpeg') }, // <-- same note
  { id: 'c7', name: 'Languages', img: require('../../assets/images/categories/language.jpeg') },
  { id: 'c8', name: 'Outdoor & adventure', img: require('../../assets/images/categories/outdoor.jpeg') },
  { id: 'c9', name: 'Chess & board games', img: require('../../assets/images/categories/chess.jpeg') },
  { id: 'c10', name: 'Photography & media', img: require('../../assets/images/categories/photography.jpeg') },
];

// ---------- Placeholder images for establishments ----------
const PLACEHOLDER_IMGS = [
  require('../../assets/images/establishment_images/placeholder1.jpeg'),
  require('../../assets/images/establishment_images/placeholder2.jpeg'),
  require('../../assets/images/establishment_images/placeholder3.jpeg'),
  require('../../assets/images/establishment_images/placeholder4.jpeg'),
  require('../../assets/images/establishment_images/placeholder5.jpeg'),
];

// ---------- Card components ----------
const CARD_W = Math.min(Math.floor(Dimensions.get('window').width * 0.78), 320);

function EstablishmentCard({
  item,
  image,
}: {
  item: ReturnType<typeof makeEst>;
  image: any;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className="mr-4"
      style={{ width: 275 }}
      onPress={() =>
        router.push({
          pathname: '/screens/establishment',
          params: { id: item.id, name: item.name },
        })
      }
    >
      <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
        {/* Image header */}
        <Image source={image} className="w-full h-48" resizeMode="cover" />

        <View className="p-3">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
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
          <Text className="text-[13px] font-bold text-gray-900 leading-tight" numberOfLines={4}>
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


type BackendEst = {
  id: number;
  name: string;
  category?: string | null;
  rating?: number | null;
  address?: string | null;
  area?: string | null; 
  image_url?: string | null;
  logo_url?: string | null;
};

function adapt(e: BackendEst): ReturnType<typeof makeEst> {
  return {
    id: String(e.id),
    name: e.name ?? 'Untitled',
    area: e.area || (e.address ? String(e.address).split(',')[0] : '') || '',
    tag: e.category || 'Hobby',
    rating: typeof e.rating === 'number' ? e.rating.toFixed(1) : '4.5',
  };
}

// For each item, choose an image source (remote if available, else placeholder)
function buildImageSources(data: BackendEst[]) {
  return data.map((e, i) => {
    const url = resolveImageUrl(e.image_url || e.logo_url || '');
    return url ? { uri: url } : PLACEHOLDER_IMGS[i % PLACEHOLDER_IMGS.length];
  });
}

// ---------- Section helpers ----------
function HorizontalSection({
  title,
  data,
  images,
}: {
  title: string;
  data: ReturnType<typeof makeEst>[];
  images: any[];
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
            image={images[index] ?? PLACEHOLDER_IMGS[index % PLACEHOLDER_IMGS.length]}
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

  // (fallback to hardcoded if fetch fails)
  const [rec, setRec] = useState<ReturnType<typeof makeEst>[]>([]);
  const [recImgs, setRecImgs] = useState<any[]>([]);
  const [newest, setNewest] = useState<ReturnType<typeof makeEst>[]>([]);
  const [newImgs, setNewImgs] = useState<any[]>([]);
  const [trend, setTrend] = useState<ReturnType<typeof makeEst>[]>([]);
  const [trendImgs, setTrendImgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [a, b, c] = await Promise.all([
        fetchEstablishments({ order: 'rating_desc', limit: 15, status: 'approved' }), // Recommended (by rating)
        fetchEstablishments({ order: 'newest',      limit: 15, status: 'approved' }), // New to Hobby
        fetchEstablishments({ order: 'clicks_desc', limit: 15, status: 'approved' }), // Trending
      ]) as [BackendEst[], BackendEst[], BackendEst[]];

      const aImgs = buildImageSources(a);
      const bImgs = buildImageSources(b);
      const cImgs = buildImageSources(c);

      setRec(a.map(adapt));
      setRecImgs(aImgs);
      setNewest(b.map(adapt));
      setNewImgs(bImgs);
      setTrend(c.map(adapt));
      setTrendImgs(cImgs);
    } catch {
      // fall back silently to hardcoded lists
      setRec([]);
      setRecImgs([]);
      setNewest([]);
      setNewImgs([]);
      setTrend([]);
      setTrendImgs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Choose API data if available; otherwise keep your original arrays
  const recData   = rec.length   ? rec   : RECOMMENDED;
  const recImages = rec.length   ? recImgs : RECOMMENDED.map((_, i) => PLACEHOLDER_IMGS[i % PLACEHOLDER_IMGS.length]);
  const newData   = newest.length? newest: NEW_TO_HOBBY;
  const newImages = newest.length? newImgs: NEW_TO_HOBBY.map((_, i) => PLACEHOLDER_IMGS[i % PLACEHOLDER_IMGS.length]);
  const trnData   = trend.length ? trend : TRENDING;
  const trnImages = trend.length ? trendImgs : TRENDING.map((_, i) => PLACEHOLDER_IMGS[i % PLACEHOLDER_IMGS.length]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Greeting */}
        <View className="px-5 pt-2">
          <Text className="text-[34px] font-extrabold text-gray-900">Hey, {userName}</Text>
        </View>

        {/* Optional loader (no styling changes to sections) */}
        {loading ? (
          <View className="px-5 mt-6">
            <ActivityIndicator />
          </View>
        ) : null}

        {/* Carousels */}
        <View className="px-5">
          <HorizontalSection title="Recommended" data={recData} images={recImages} />
          <HorizontalSection title="New to Hobby" data={newData} images={newImages} />
          <HorizontalSection title="Trending" data={trnData} images={trnImages} />
        </View>

        {/* Categories (5x2 grid) */}
        <View className="px-5 mt-12">
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
