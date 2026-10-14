-- Preserve every existing player ID, session, recovery hash and learning record.
-- Existing users choose a curated name once; unselected names are not public.
ALTER TABLE players ADD COLUMN name_locked INTEGER NOT NULL DEFAULT 0 CHECK(name_locked IN (0,1));
ALTER TABLE players ADD COLUMN recovery_version INTEGER NOT NULL DEFAULT 0;
-- Keep a unique existing name when it already belongs to the approved vocabulary.
UPDATE players SET name_locked=1 WHERE nickname IN (SELECT a.value || ' ' || n.value FROM json_each('["반짝이는","빛나는","춤추는","달리는","웃는","노래하는","꿈꾸는","생각하는","탐구하는","배우는","읽는","그리는","만드는","찾아가는","날아가는","헤엄치는","산책하는","도전하는","자라나는","기다리는","인사하는","응원하는","도와주는","함께하는","빛을찾는","길을찾는","별을보는","하늘보는","숲을걷는","바다보는","차분한","따뜻한","다정한","친절한","명랑한","활기찬","씩씩한","튼튼한","든든한","부지런한","꼼꼼한","신중한","슬기로운","지혜로운","용감한","궁금한","즐거운","행복한","포근한","편안한","고요한","맑은","푸른","초록빛","은빛","금빛","새하얀","보랏빛","주홍빛","햇살같은","달빛같은","별빛같은","봄빛같은","상냥한","정다운","반가운","싱그러운","산뜻한","새로운","느긋한","재빠른","날렵한","가벼운","자유로운","꾸준한","성실한","정직한","소중한","멋진","신나는"]') a CROSS JOIN json_each('["사과","고래","돌고래","다람쥐","토끼","고양이","강아지","여우","판다","수달","펭귄","부엉이","참새","제비","비둘기","두루미","백조","오리","갈매기","사슴","기린","코끼리","알파카","양","조랑말","비버","나비","잠자리","무당벌레","반딧불이","꿀벌","달팽이","거북이","해마","불가사리","해파리","문어","오징어","바다표범","물개","복숭아","포도","딸기","수박","참외","멜론","배","귤","오렌지","레몬","라임","자두","살구","체리","블루베리","키위","바나나","망고","파인애플","코코넛","도토리","밤톨","호두","잣","은행나무","단풍나무","소나무","대나무","자작나무","버드나무","해바라기","민들레","튤립","장미","수선화","라벤더","데이지","연꽃","풀잎","새싹","별","달","구름","햇살","무지개","이슬","눈꽃","바람","파도","강물","숲","산","언덕","호수","샘물","조약돌","모래알","산호","조개","진주"]') n) AND NOT EXISTS(SELECT 1 FROM players other WHERE other.nickname=players.nickname AND other.id<>players.id);
CREATE UNIQUE INDEX idx_players_curated_name ON players(nickname) WHERE name_locked=1;
CREATE TABLE account_requests (
 key_hash TEXT PRIMARY KEY,
 player_id TEXT NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
 request_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE answer_receipts (
 attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
 request_id TEXT NOT NULL,
 fingerprint TEXT NOT NULL,
 operation_token TEXT NOT NULL,
 step INTEGER NOT NULL,
 correct INTEGER NOT NULL CHECK(correct IN (0,1)),
 complete INTEGER NOT NULL CHECK(complete IN (0,1)),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(attempt_id,request_id)
);
