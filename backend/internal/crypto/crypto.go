package crypto

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
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

// encryptionKey 返回 32 字节 AES 密钥。
// 优先取 ENCRYPTION_KEY 环境变量；未设置时自动生成随机密钥并持久化到
// keyFile（0600），确保密码始终加密存储（I8）。
func encryptionKey() []byte {
	if key := os.Getenv("ENCRYPTION_KEY"); key != "" {
		if decoded, err := hex.DecodeString(key); err == nil && len(decoded) == 32 {
			return decoded
		}
	}
	if keyFile != "" {
		genKeyMu.Lock()
		defer genKeyMu.Unlock()
		if data, err := os.ReadFile(keyFile); err == nil {
			if decoded, err := hex.DecodeString(string(bytes.TrimSpace(data))); err == nil && len(decoded) == 32 {
				return decoded
			}
		}
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
