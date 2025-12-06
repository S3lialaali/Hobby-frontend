import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resolveImageUrl } from '../../api/client';
import { fetchEstablishments } from '../../api/establishments';
import { useAuth } from '../../sessions/AuthContext';


// -------- Categories --------
export const CATEGORIES = [
  { id: 'c1', name: 'Sports & fitness', img: require('../../assets/images/categories/sports.jpeg') },
  { id: 'c2', name: 'Water activities', img: require('../../assets/images/categories/swimming.jpeg') },
  { id: 'c3', name: 'Arts & crafts', img: require('../../assets/images/categories/arts.jpeg') },
  { id: 'c4', name: 'Music & performing arts', img: require('../../assets/images/categories/music.jpeg') },
  { id: 'c5', name: 'Cooking', img: require('../../assets/images/categories/cooking.jpeg') },
  { id: 'c6', name: 'Technology & coding', img: require('../../assets/images/categories/technology.jpeg') },
  { id: 'c7', name: 'Languages', img: require('../../assets/images/categories/language.jpeg') },
  { id: 'c8', name: 'Outdoor & adventure', img: require('../../assets/images/categories/outdoor.jpeg') },
  { id: 'c9', name: 'Chess & board games', img: require('../../assets/images/categories/chess.jpeg') },
  { id: 'c10', name: 'Photography & media', img: require('../../assets/images/categories/photography.jpeg') },
];

// --------  placeholder fallback --------
const PLACEHOLDER_IMG = require('../../assets/images/establishment_images/placeholder1.jpeg');

// -------- Types to match card UI  --------
type CardEst = {
  id: string;
  name: string;
  area: string;       
  tag: string;         
  rating: number;      
  reviewCount: number; 
};

type BackendEst = {
  id: number;
  name: string;
  category?: string | null;
  ratings?: number | string | null;      
  rating?: number | string | null;      
  review_count?: number | string | null; 
  address?: string | null;
  area?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
};

// -------- Star row --------
function StarRow({ rating, count }: { rating: number; count: number }) {
  const r = Number.isFinite(rating) ? rating : 0;
  const full = Math.floor(r);
  const hasHalf = r - full >= 0.5;

  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return 'star';
    if (i === full && hasHalf) return 'star-half-full';
    return 'star-o';
  });

  return (
    <View className="flex-row items-center">
      {/* rating number */}
      <Text className="text-[13px] font-semibold text-gray-900 mr-2">
        {r.toFixed(1)}
      </Text>

      {/* star icons */}
      <View className="flex-row space-x-1">
        {stars.map((name, idx) => (
          <FontAwesome key={idx} name={name as any} size={12} color="#111" />
        ))}
      </View>

      {/* count */}
      {count > 0 ? (
        <Text className="ml-2 text-[12px] text-gray-600">({count})</Text>
      ) : null}
    </View>
  );
}

// -------- Card components --------
function EstablishmentCard({
  item,
  image,
}: {
  item: CardEst;
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
            {/* rating row with stars + count */}
            <StarRow rating={item.rating} count={item.reviewCount} />
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

// Accept onPress so Home → Search 
function CategoryCard({ name, img, onPress }: { name: string; img: any; onPress?: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} className="flex-1" onPress={onPress}>
      <View className="h-28 mb-4 mr-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 flex-row">
        {/* TEXT */}
        <View className="flex-[2] justify-center px-4">
          <Text className="text-[13px] font-bold text-gray-900 leading-tight" numberOfLines={4}>
            {name}
          </Text>
        </View>

        {/* IMAGE */}
        <View className="flex-[3]">
          <Image source={img} className="w-full h-full" resizeMode="cover" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// -------- Backend → Card adapter --------
function adapt(e: BackendEst): CardEst {
  const ratingNum = Number(e.ratings ?? e.rating ?? 0);
  const reviewCnt = Number(e.review_count ?? 0);

  return {
    id: String(e.id),
    name: e.name ?? 'Untitled',
    area: e.area || (e.address ? String(e.address).split(',')[0] : '') || '',
    tag: e.category || 'Hobby',
    rating: Number.isFinite(ratingNum) ? ratingNum : 0,
    reviewCount: Number.isFinite(reviewCnt) ? reviewCnt : 0,
  };
}

// Pick image source per item (remote URL if available; else placeholder)
function buildImageSources(data: BackendEst[]) {
  return data.map((e) => {
    const url = resolveImageUrl(e.image_url || e.logo_url || '');
    return url ? { uri: url } : PLACEHOLDER_IMG;
  });
}

// -------- Section helper --------
function HorizontalSection({
  title,
  data,
  images,
}: {
  title: string;
  data: CardEst[];
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
            image={images[index] ?? PLACEHOLDER_IMG}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      />
    </View>
  );
}

// -------- Screen --------
export default function HomeScreen() {
  const { user } = useAuth();
  const userName = user?.username ?? user?.name ?? 'there';
  const router = useRouter();

  // Each section pulls from backend
  const [rec, setRec] = useState<CardEst[]>([]);
  const [recImgs, setRecImgs] = useState<any[]>([]);
  const [newest, setNewest] = useState<CardEst[]>([]);
  const [newImgs, setNewImgs] = useState<any[]>([]);
  const [trend, setTrend] = useState<CardEst[]>([]);
  const [trendImgs, setTrendImgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [a, b, c] = await Promise.all([
        fetchEstablishments({ order: 'rating_desc', limit: 15, status: 'approved' }), // Recommended by rating
        fetchEstablishments({ order: 'newest',      limit: 15, status: 'approved' }), // New to Hobby
        fetchEstablishments({ order: 'clicks_desc', limit: 15, status: 'approved' }), // Trending
      ]) as [BackendEst[], BackendEst[], BackendEst[]];

      setRec(a.map(adapt));
      setRecImgs(buildImageSources(a));

      setNewest(b.map(adapt));
      setNewImgs(buildImageSources(b));

      setTrend(c.map(adapt));
      setTrendImgs(buildImageSources(c));
    } catch {
      // On failure, leave arrays empty; sections will be hidden
      setRec([]); setRecImgs([]);
      setNewest([]); setNewImgs([]);
      setTrend([]); setTrendImgs([]);
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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
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

        {/* Optional loader */}
        {loading ? (
          <View className="px-5 mt-6">
            <ActivityIndicator />
          </View>
        ) : null}

        {/* Carousels — hide section if API returned 0 items */}
        <View className="px-5">
          {rec.length > 0 && (
            <HorizontalSection title="Recommended" data={rec} images={recImgs} />
          )}
          {newest.length > 0 && (
            <HorizontalSection title="New to Hobby" data={newest} images={newImgs} />
          )}
          {trend.length > 0 && (
            <HorizontalSection title="Trending" data={trend} images={trendImgs} />
          )}
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
            renderItem={({ item }) => (
              <CategoryCard
                name={item.name}
                img={item.img}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/search',
                    params: { category: item.name },
                  })
                }
              />
            )}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
