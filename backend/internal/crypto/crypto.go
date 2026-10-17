package crypto

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
)

// keyFile 是持久化的加密密钥文件路径（ENCRYPTION_KEY 未设置时自动生成）。
var keyFile string

// genKeyMu 保护密钥生成和文件写入的并发安全。
var genKeyMu sync.Mutex

// SetKeyFile 设置自动生成的密钥文件路径，由入口在启动时调用。
func SetKeyFile(path string) {
	keyFile = path
}

// derivationID 返回用于派生确定性加密密钥的唯一标识。
// 优先使用容器运行时注入的 OPENAPPID 环境变量；
// 其次回退到 package.yml 中的 package 字段（格式：cloud.lazycat.app.<subdomain>）；
// 最终回退到 lzc-manifest.yml 中的 application.subdomain。
// 这确保同一应用在所有 LPK 升级中保持相同的加密密钥，避免密钥丢失导致账户数据"消失"。
func derivationID() string {
	if id := os.Getenv("OPENAPPID"); id != "" {
		return id
	}
	if id := os.Getenv("OPEN_APP_ID"); id != "" {
		return id
	}
	// 读取 package.yml（lzc/ 目录）
	for _, p := range []string{"package.yml", "lzc/package.yml"} {
		data, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		// package: cloud.lazycat.app.<subdomain>
		for _, line := range bytes.Split(data, []byte("\n")) {
			line = bytes.TrimSpace(line)
			if bytes.HasPrefix(line, []byte("package:")) {
				id := string(bytes.TrimSpace(bytes.TrimPrefix(line, []byte("package:"))))
				if id != "" {
					return id
				}
			}
		}
	}
	// 读取 lzc-manifest.yml
	for _, p := range []string{"lzc-manifest.yml", "lzc/lzc-manifest.yml"} {
		data, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		inApp := false
		for _, line := range bytes.Split(data, []byte("\n")) {
			line = bytes.TrimSpace(line)
			if bytes.Equal(line, []byte("application:")) {
				inApp = true
				continue
			}
			if inApp && bytes.HasPrefix(line, []byte("subdomain:")) {
				id := string(bytes.TrimSpace(bytes.TrimPrefix(line, []byte("subdomain:"))))
				if id != "" {
					return "cloud.lazycat.app." + id
				}
			}
			// 遇到下一个顶层键则停止
			if inApp && !bytes.HasPrefix(line, []byte(" ")) && !bytes.HasPrefix(line, []byte("\t")) && len(line) > 0 && !bytes.HasPrefix(line, []byte("#")) {
				inApp = false
			}
		}
	}
	return ""
}

// deterministicKey 基于 derivationID 生成稳定的 32 字节 AES 密钥。
// 相同的应用 ID 始终产生相同的密钥，确保 LPK 升级后仍可解密已有数据。
func deterministicKey(id string) []byte {
	h := sha256.Sum256([]byte(id))
	return h[:]
}

// encryptionKey 返回 32 字节 AES 密钥。
// 优先级：ENCRYPTION_KEY 环境变量 > 确定性派生（OPENAPPID / package.yml / subdomain）> 随机生成并持久化。
func encryptionKey() []byte {
	// 1. 显式环境变量（最高优先级）
	if key := os.Getenv("ENCRYPTION_KEY"); key != "" {
		if decoded, err := hex.DecodeString(key); err == nil && len(decoded) == 32 {
			return decoded
		}
	}
	// 2. 已持久化的密钥文件（兼容旧部署）
	if keyFile != "" {
		genKeyMu.Lock()
		defer genKeyMu.Unlock()
		if data, err := os.ReadFile(keyFile); err == nil {
			if decoded, err := hex.DecodeString(string(bytes.TrimSpace(data))); err == nil && len(decoded) == 32 {
				return decoded
			}
		}
	}
	// 3. 确定性派生（LPK 升级场景：keyFile 丢失时使用）
	id := derivationID()
	if id != "" {
		key := deterministicKey(id)
		log.Printf("[crypto] using deterministic encryption key derived from app identity: %s", id)
		return key
	}
	// 4. 回退：随机生成（仅本地开发等非容器环境）
	if keyFile != "" {
		genKeyMu.Lock()
		defer genKeyMu.Unlock()
		key := make([]byte, 32)
		if _, err := io.ReadFull(rand.Reader, key); err != nil {
			log.Printf("[WARN] unable to generate encryption key: %v", err)
			return nil
		}
		if err := os.MkdirAll(filepath.Dir(keyFile), 0755); err != nil {
			log.Printf("[WARN] unable to create key dir: %v", err)
			return nil
		}
		if err := os.WriteFile(keyFile, []byte(hex.EncodeToString(key)), 0600); err != nil {
			log.Printf("[WARN] unable to persist encryption key: %v", err)
			return nil
		}
		log.Printf("[crypto] generated random encryption key (no app identity found)")
		return key
	}
	log.Printf("[FATAL] ENCRYPTION_KEY not set and no key file - cannot securely store credentials. Set ENCRYPTION_KEY env var or run in data directory mode.")
	return nil
}

func Encrypt(plaintext string) (string, error) {
	key := encryptionKey()
	if key == nil {
		return "", fmt.Errorf("encryption key unavailable, cannot encrypt")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := aesGCM.Seal(nil, nonce, []byte(plaintext), nil)
	return hex.EncodeToString(nonce) + hex.EncodeToString(ciphertext), nil
}

func Decrypt(encoded string) (string, error) {
	key := encryptionKey()
	if key == nil {
		return "", fmt.Errorf("encryption key unavailable, cannot decrypt")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := aesGCM.NonceSize()
	if len(encoded) < nonceSize*2 {
		return "", errors.New("ciphertext too short")
	}
	nonce, err := hex.DecodeString(encoded[:nonceSize*2])
	if err != nil {
		return "", err
	}
	ciphertext, err := hex.DecodeString(encoded[nonceSize*2:])
	if err != nil {
		return "", err
	}
	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt failed: %w", err)
	}
	return string(plaintext), nil
}
